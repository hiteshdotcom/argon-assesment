import sharp from "sharp";
import { config } from "../config";
import type { Validator } from "./types";

/**
 * Variance-of-Laplacian blur detector.
 *
 * 1. grayscale + downscale (cheaper + denoise)
 * 2. convolve with a 3x3 Laplacian kernel
 * 3. compute variance of the response — low variance ≈ blurry image
 */
const LAPLACIAN_KERNEL = {
  width: 3,
  height: 3,
  kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
};

export const blurValidator: Validator = {
  name: "blur",
  async run(ctx) {
    const { data } = await sharp(ctx.buffer)
      .resize(512, 512, { fit: "inside" })
      .grayscale()
      .convolve(LAPLACIAN_KERNEL)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Welford's online variance to avoid two passes / float blow-up.
    let n = 0;
    let mean = 0;
    let m2 = 0;
    for (let i = 0; i < data.length; i++) {
      n++;
      const delta = data[i] - mean;
      mean += delta / n;
      m2 += delta * (data[i] - mean);
    }
    const variance = n > 1 ? m2 / (n - 1) : 0;
    ctx.computed.blurScore = variance;

    if (variance < config.BLUR_VARIANCE_MIN) {
      return {
        passed: false,
        reason: `Image is too blurry (variance ${variance.toFixed(2)} < ${config.BLUR_VARIANCE_MIN})`,
        meta: { blurScore: variance },
      };
    }
    return { passed: true, meta: { blurScore: variance } };
  },
};
