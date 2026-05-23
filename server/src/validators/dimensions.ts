import sharp from "sharp";
import { config } from "../config";
import type { Validator } from "./types";

export const dimensionsValidator: Validator = {
  name: "dimensions",
  async run(ctx) {
    const meta = await sharp(ctx.buffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    ctx.computed.width = width;
    ctx.computed.height = height;

    const failures: string[] = [];
    if (ctx.sizeBytes < config.MIN_FILE_BYTES) {
      failures.push(`file too small: ${ctx.sizeBytes}B < ${config.MIN_FILE_BYTES}B`);
    }
    if (width < config.MIN_WIDTH) {
      failures.push(`width ${width}px < ${config.MIN_WIDTH}px`);
    }
    if (height < config.MIN_HEIGHT) {
      failures.push(`height ${height}px < ${config.MIN_HEIGHT}px`);
    }

    if (failures.length > 0) {
      return {
        passed: false,
        reason: failures.join("; "),
        meta: { width, height, sizeBytes: ctx.sizeBytes },
      };
    }
    return { passed: true, meta: { width, height } };
  },
};
