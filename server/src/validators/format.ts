import { fromBuffer } from "file-type";
import type { Validator } from "./types";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);

export const formatValidator: Validator = {
  name: "format",
  async run(ctx) {
    const detected = await fromBuffer(ctx.buffer);
    if (!detected) {
      return { passed: false, reason: "Could not detect file type from magic bytes" };
    }
    if (!ALLOWED.has(detected.mime)) {
      return {
        passed: false,
        reason: `Disallowed format: ${detected.mime} (allowed: JPEG, PNG, HEIC)`,
        meta: { detected: detected.mime },
      };
    }
    return { passed: true, meta: { detected: detected.mime } };
  },
};
