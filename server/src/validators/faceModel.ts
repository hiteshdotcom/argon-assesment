/**
 * Lazy face-api loader. Returns null if the model directory is missing
 * (so the app runs end-to-end without weights) or if loading fails.
 *
 * Weights expected: ssd_mobilenetv1_model-*  in config.FACE_MODEL_PATH.
 * Download from https://github.com/vladmandic/face-api/tree/master/model
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { config } from "../config";

type FaceBox = { x: number; y: number; width: number; height: number };
type DetectFn = (buffer: Buffer) => Promise<FaceBox[]>;

let cached: DetectFn | null | undefined;

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
    await import("@tensorflow/tfjs-node");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir);

    cached = async (buffer: Buffer) => {
      // face-api expects an HTMLImageElement/Tensor; in Node we decode to raw RGB.
      const { data, info } = await sharp(buffer)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const tf = await import("@tensorflow/tfjs-node");
      const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], "int32");
      try {
        const detections = await faceapi.detectAllFaces(tensor as unknown as faceapi.TNetInput);
        return detections.map((d) => ({
          x: d.box.x,
          y: d.box.y,
          width: d.box.width,
          height: d.box.height,
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
