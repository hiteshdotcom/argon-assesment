/**
 * Lazy face-api loader. Returns null if the model directory is missing
 * (so the app runs end-to-end without weights) or if loading fails.
 *
 * Weights expected: ssd_mobilenetv1_model-*  in config.FACE_MODEL_PATH.
 * Download from https://github.com/vladmandic/face-api/tree/master/model
 */
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import sharp from "sharp";
import { config } from "../config";

// ── Node 22+ compatibility shim ──────────────────────────────────────────────
// `util.isNullOrUndefined` was deprecated in Node 4 and *removed* in Node 22+.
// @tensorflow/tfjs-node@4.22 still calls it from createTensorsTypeOpAttr, which
// blows up on first inference with "isNullOrUndefined is not a function".
// Patch the util module BEFORE tfjs-node loads.
const utilAny = util as unknown as { isNullOrUndefined?: (v: unknown) => boolean };
if (typeof utilAny.isNullOrUndefined !== "function") {
  utilAny.isNullOrUndefined = (v: unknown) => v === null || v === undefined;
}

type FaceBox = { x: number; y: number; width: number; height: number };
type DetectFn = (buffer: Buffer) => Promise<FaceBox[]>;

let cached: DetectFn | null | undefined;

/**
 * Max edge fed to the detector. SSD MobileNetV1 internally resizes to ~512px,
 * so feeding a 4000×3000 source just makes sharp + the Cast op work harder
 * for no accuracy gain. 640 keeps a typical headshot face ~80–120px wide,
 * well above the detector's minimum.
 */
const DETECT_MAX_EDGE = 640;

export async function getFaceDetector(): Promise<DetectFn | null> {
  if (cached !== undefined) return cached;

  const modelDir = path.resolve(config.FACE_MODEL_PATH);
  if (!fs.existsSync(modelDir)) {
    console.warn(`[faceModel] model dir not found at ${modelDir} — face validators will pass-through`);
    cached = null;
    return cached;
  }

  try {
    // Dynamic imports keep tfjs-node off the cold path when weights are absent.
    const faceapi = await import("@vladmandic/face-api");
    const tf = await import("@tensorflow/tfjs-node");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir);
    console.log("[faceModel] SSD MobileNetV1 loaded from", modelDir);

    cached = async (buffer: Buffer) => {
      // Decode header once for original dims (cheap — just parses the header).
      const meta = await sharp(buffer).metadata();
      const origW = meta.width ?? 0;
      const origH = meta.height ?? 0;

      // Downscale before handing pixels to TF — same accuracy, ~10× faster.
      const { data, info } = await sharp(buffer)
        .resize(DETECT_MAX_EDGE, DETECT_MAX_EDGE, { fit: "inside", withoutEnlargement: true })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const scaleX = origW > 0 ? origW / info.width : 1;
      const scaleY = origH > 0 ? origH / info.height : 1;

      const tensor = tf.tensor3d(
        new Uint8Array(data),
        [info.height, info.width, 3],
        "int32",
      );
      try {
        // Cast through `unknown` — tfjs-node's tensor type isn't directly assignable
        // to face-api's TNetInput in TS, but is compatible at runtime.
        const detections = await faceapi.detectAllFaces(
          tensor as unknown as Parameters<typeof faceapi.detectAllFaces>[0],
        );
        // Scale boxes back to original-image coordinates so faceSize's
        // (face_area / image_area) ratio uses a consistent coordinate space.
        return detections.map((d) => ({
          x: d.box.x * scaleX,
          y: d.box.y * scaleY,
          width: d.box.width * scaleX,
          height: d.box.height * scaleY,
        }));
      } finally {
        tensor.dispose();
      }
    };
    return cached;
  } catch (err) {
    console.warn("[faceModel] failed to load — face validators will pass-through", err);
    cached = null;
    return cached;
  }
}
