import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default("development"),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),

  DATABASE_URL: z.string(),

  S3_ENDPOINT: z.string(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string(),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_FORCE_PATH_STYLE: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === true || v === "true")
    .default(true),
  S3_PRESIGN_TTL_SECONDS: z.coerce.number().default(900),

  MAX_UPLOAD_BYTES: z.coerce.number().default(15 * 1024 * 1024),
  MIN_FILE_BYTES: z.coerce.number().default(20 * 1024),
  MIN_WIDTH: z.coerce.number().default(512),
  MIN_HEIGHT: z.coerce.number().default(512),

  BLUR_VARIANCE_MIN: z.coerce.number().default(80),
  SIMILARITY_HAMMING_MAX: z.coerce.number().default(6),
  FACE_AREA_MIN_RATIO: z.coerce.number().default(0.05),

  FACE_MODEL_PATH: z.string().default("./models"),
});

export const config = schema.parse(process.env);
export type Config = typeof config;
