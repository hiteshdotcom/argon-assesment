import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { fromBuffer } from "file-type";
import { v4 as uuid } from "uuid";
import { z } from "zod";

import { config } from "../config";
import { prisma } from "../db";
import { putObject, deleteObject, presignGetUrl } from "../s3";
import { enqueue } from "../queue";
import { PROCESS_IMAGE } from "../services/imageProcessor";
import { uploadLimiter } from "../middleware/rateLimit";

export const imagesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 },
});

const EDGE_ALLOWED = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);

const statusQuery = z.object({
  status: z.enum(["pending", "processing", "accepted", "rejected"]).optional(),
});

async function serializeImage(row: {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  s3Key: string;
  status: string;
  rejectionReasons: unknown;
  perceptualHash: string | null;
  faceCount: number | null;
  blurScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    status: row.status,
    rejectionReasons: row.rejectionReasons,
    perceptualHash: row.perceptualHash,
    faceCount: row.faceCount,
    blurScore: row.blurScore,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // Never expose the raw S3 key or creds — only short-lived presigned URLs.
    previewUrl: await presignGetUrl(row.s3Key),
  };
}

imagesRouter.get("/", async (req, res, next) => {
  try {
    const parsed = statusQuery.parse(req.query);
    const rows = await prisma.image.findMany({
      where: parsed.status ? { status: parsed.status.toUpperCase() as never } : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json(await Promise.all(rows.map(serializeImage)));
  } catch (err) {
    next(err);
  }
});

imagesRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(await serializeImage(row));
  } catch (err) {
    next(err);
  }
});

imagesRouter.post("/", uploadLimiter, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "no_file", message: "Field 'file' is required" });
      return;
    }

    // ── Edge validation: magic-byte sniff + size guard ──────────────────────
    const detected = await fromBuffer(req.file.buffer);
    if (!detected || !EDGE_ALLOWED.has(detected.mime)) {
      res.status(415).json({
        error: "unsupported_media_type",
        message: `Detected ${detected?.mime ?? "unknown"}; allowed: JPEG, PNG, HEIC`,
      });
      return;
    }

    // ── HEIC → JPEG conversion on the edge so downstream is uniform ─────────
    let storedBuffer = req.file.buffer;
    let storedMime = detected.mime;
    let storedExt = detected.ext;
    if (detected.mime === "image/heic" || detected.mime === "image/heif") {
      storedBuffer = await sharp(req.file.buffer).jpeg({ quality: 92 }).toBuffer();
      storedMime = "image/jpeg";
      storedExt = "jpg";
    }

    // ── S3 key is server-generated; user input never touches the path ───────
    const id = uuid();
    const s3Key = `uploads/${id}.${storedExt}`;

    await putObject({ key: s3Key, body: storedBuffer, contentType: storedMime });

    const row = await prisma.image.create({
      data: {
        id,
        originalName: req.file.originalname,
        mimeType: storedMime,
        sizeBytes: storedBuffer.length,
        s3Key,
        status: "PENDING",
      },
    });

    enqueue(PROCESS_IMAGE, { imageId: row.id });

    res.status(202).json({ id: row.id, status: row.status });
  } catch (err) {
    next(err);
  }
});

imagesRouter.delete("/:id", async (req, res, next) => {
  try {
    const row = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!row) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    await deleteObject(row.s3Key).catch((e) => {
      // S3 delete failure shouldn't block row removal — log and continue.
      console.warn(`[delete] s3 delete failed for ${row.s3Key}`, e);
    });
    await prisma.image.delete({ where: { id: row.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
