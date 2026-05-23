import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { runPipeline } from "../validators";
import { registerHandler } from "../queue";
import { s3 } from "../s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config";
import type { Readable } from "node:stream";

export const PROCESS_IMAGE = "processImage";

export interface ProcessImagePayload {
  imageId: string;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function processImage(payload: ProcessImagePayload): Promise<void> {
  const { imageId } = payload;
  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image) {
    console.warn(`[processImage] image ${imageId} not found`);
    return;
  }

  await prisma.image.update({
    where: { id: imageId },
    data: { status: "PROCESSING" },
  });

  // Pull the (already-converted-if-HEIC) object back from S3 for validation.
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: image.s3Key }),
  );
  const buffer = await streamToBuffer(obj.Body as Readable);

  const report = await runPipeline({
    imageId,
    buffer,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    computed: {},
  });

  await prisma.image.update({
    where: { id: imageId },
    data: {
      status: report.passed ? "ACCEPTED" : "REJECTED",
      rejectionReasons: report.passed ? Prisma.JsonNull : report.rejectionReasons,
      width: report.computed.width ?? null,
      height: report.computed.height ?? null,
      blurScore: report.computed.blurScore ?? null,
      perceptualHash: report.computed.perceptualHash ?? null,
      faceCount: report.computed.faceCount ?? null,
    },
  });
}

// Register on module load so the queue knows how to handle `processImage`.
registerHandler<ProcessImagePayload>(PROCESS_IMAGE, processImage);
