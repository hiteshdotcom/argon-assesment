import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "./config";

export const s3 = new S3Client({
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
  forcePathStyle: config.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_KEY,
  },
});

export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: config.S3_BUCKET }));
    return;
  } catch (err: unknown) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    // 403 = bucket exists but we lack HeadBucket perms — that's fine, keep going.
    if (status === 403) return;
  }

  // Bucket missing (or HEAD returned 404): try to create it.
  // AWS S3 requires a LocationConstraint for any region other than us-east-1;
  // MinIO accepts the same shape.
  try {
    await s3.send(
      new CreateBucketCommand({
        Bucket: config.S3_BUCKET,
        ...(config.S3_REGION !== "us-east-1"
          ? { CreateBucketConfiguration: { LocationConstraint: config.S3_REGION as never } }
          : {}),
      }),
    );
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    // Race or already-yours: don't fail boot.
    if (code === "BucketAlreadyOwnedByYou" || code === "BucketAlreadyExists") return;
    throw err;
  }
}

export async function putObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
  );
}

export async function presignGetUrl(key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }),
    { expiresIn: config.S3_PRESIGN_TTL_SECONDS },
  );
}
