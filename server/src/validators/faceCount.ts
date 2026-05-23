import sharp from "sharp";
import { getFaceDetector } from "./faceModel";
import type { Validator } from "./types";

export const faceCountValidator: Validator = {
  name: "faceCount",
  async run(ctx) {
    const detect = await getFaceDetector();
    if (!detect) {
      // TODO(model): drop face-api weights into ./models to enable this rule.
      return { passed: true, meta: { skipped: true, reason: "model_unavailable" } };
    }

    const faces = await detect(ctx.buffer);
    ctx.computed.faceCount = faces.length;
    // Cache boxes + image dims for faceSize so it doesn't re-detect.
    const meta = await sharp(ctx.buffer).metadata();
    ctx._faces = { boxes: faces, imageWidth: meta.width ?? 0, imageHeight: meta.height ?? 0 };

    if (faces.length !== 1) {
      return {
        passed: false,
        reason: `Expected exactly 1 face, found ${faces.length}`,
        meta: { faceCount: faces.length },
      };
    }
    return { passed: true, meta: { faceCount: faces.length } };
  },
};

// Augment ValidatorContext with the optional cached detection payload.
declare module "./types" {
  interface ValidatorContext {
    _faces?: {
      boxes: { x: number; y: number; width: number; height: number }[];
      imageWidth: number;
      imageHeight: number;
    };
  }
}
