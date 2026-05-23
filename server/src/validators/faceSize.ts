import sharp from "sharp";
import { config } from "../config";
import { getFaceDetector } from "./faceModel";
import type { Validator } from "./types";

export const faceSizeValidator: Validator = {
  name: "faceSize",
  async run(ctx) {
    const detect = await getFaceDetector();
    if (!detect) {
      // TODO(model): drop face-api weights into ./models to enable this rule.
      return { passed: true, meta: { skipped: true, reason: "model_unavailable" } };
    }

    // Re-use faceCount's detection if already cached on ctx.
    let boxes = ctx._faces?.boxes;
    let imageWidth = ctx._faces?.imageWidth ?? 0;
    let imageHeight = ctx._faces?.imageHeight ?? 0;
    if (!boxes) {
      boxes = await detect(ctx.buffer);
      const meta = await sharp(ctx.buffer).metadata();
      imageWidth = meta.width ?? 0;
      imageHeight = meta.height ?? 0;
    }

    if (boxes.length === 0) {
      return { passed: false, reason: "No face detected", meta: { faceCount: 0 } };
    }

    const imgArea = imageWidth * imageHeight;
    if (imgArea === 0) {
      return { passed: false, reason: "Image has zero area" };
    }
    const largest = boxes.reduce(
      (acc, b) => Math.max(acc, b.width * b.height),
      0,
    );
    const ratio = largest / imgArea;

    if (ratio < config.FACE_AREA_MIN_RATIO) {
      return {
        passed: false,
        reason: `Largest face covers ${(ratio * 100).toFixed(1)}% of image (min ${(config.FACE_AREA_MIN_RATIO * 100).toFixed(1)}%)`,
        meta: { ratio },
      };
    }
    return { passed: true, meta: { ratio } };
  },
};
