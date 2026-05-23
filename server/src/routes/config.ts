import { Router } from "express";
import { config } from "../config";
import { getFaceDetector } from "../validators/faceModel";

export const configRouter = Router();

/**
 * GET /api/config
 *
 * Runtime info the client needs to render accurate UI:
 *  - `faceModelLoaded` — if false, faceCount/faceSize silently pass,
 *    so the UI shows "skipped" instead of falsely implying they ran.
 *  - thresholds — for human-readable "needs ≥ X" labels.
 */
configRouter.get("/", async (_req, res) => {
  const faceDetector = await getFaceDetector();
  res.json({
    faceModelLoaded: faceDetector !== null,
    thresholds: {
      minWidth: config.MIN_WIDTH,
      minHeight: config.MIN_HEIGHT,
      minFileBytes: config.MIN_FILE_BYTES,
      maxUploadBytes: config.MAX_UPLOAD_BYTES,
      blurVarianceMin: config.BLUR_VARIANCE_MIN,
      similarityHammingMax: config.SIMILARITY_HAMMING_MAX,
      faceAreaMinRatio: config.FACE_AREA_MIN_RATIO,
    },
  });
});
