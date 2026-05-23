/**
 * Validators receive a shared `ctx` so they can re-use expensive intermediates
 * (decoded pixel buffers, metadata) instead of re-decoding the image per rule.
 */

export interface ValidatorContext {
  imageId: string;
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  /** Filled in opportunistically by validators that probe metadata. */
  computed: {
    width?: number;
    height?: number;
    blurScore?: number;
    perceptualHash?: string;
    faceCount?: number;
  };
}

export interface ValidatorResult {
  passed: boolean;
  reason?: string;
  meta?: Record<string, unknown>;
}

export type Validator = {
  name: string;
  run: (ctx: ValidatorContext) => Promise<ValidatorResult>;
};
