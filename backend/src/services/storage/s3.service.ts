import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import { getTenantId } from "../../utils/asyncstorage";
import { HttpError } from "../../utils/http";
import logger from "../../config/logger";

const DEFAULT_PUT_EXPIRES = 3600;
const DEFAULT_GET_EXPIRES = 3600;

class S3Service {
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private bucketEnsured = false;

  private getBucket(): string {
    const bucket = process.env.S3_BUCKET?.trim();
    if (!bucket) {
      throw new HttpError(500, "S3_BUCKET is not configured");
    }
    return bucket;
  }

  private getClient(): S3Client {
    if (this.client) {
      return this.client;
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
    if (!accessKeyId || !secretAccessKey) {
      throw new HttpError(500, "AWS credentials are not configured");
    }

    const region = process.env.AWS_REGION?.trim() || "us-east-1";
    const isLocal = process.env.NODE_ENV === "local";
    const endpoint = "http://127.0.0.1:9000";
    const forcePathStyle =
      isLocal ||
      process.env.S3_FORCE_PATH_STYLE === "true" ||
      process.env.S3_FORCE_PATH_STYLE === "1";

    const config: S3ClientConfig = {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
    };

    if (endpoint) {
      config.endpoint = endpoint;
    }

    this.client = new S3Client(config);

    this.bucket = this.getBucket();
    return this.client;
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) {
      return;
    }

    const client = this.getClient();
    const bucket = this.bucket ?? this.getBucket();

    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      this.bucketEnsured = true;
      return;
    } catch {
      if (process.env.NODE_ENV !== "local") {
        throw new HttpError(500, "S3 bucket is not accessible");
      }
      logger.info("S3 bucket missing, attempting create (local only)", {
        bucket,
      });
    }

    try {
      if (process.env.NODE_ENV === "local") {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
      }
      this.bucketEnsured = true;
    } catch (error) {
      const name = (error as { name?: string })?.name;
      if (
        name === "BucketAlreadyOwnedByYou" ||
        name === "BucketAlreadyExists"
      ) {
        this.bucketEnsured = true;
        return;
      }
      logger.error("Failed to ensure S3 bucket", {
        bucket,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new HttpError(500, "Unable to access or create S3 bucket");
    }
  }

  /**
   * Object key: tenants/{tenant_id}/programs/{program_id}/sessions/{filename}
   */
  buildSessionObjectKey(programId: string, filename: string): string {
    const tenantId = getTenantId();
    const safeName = this.sanitizeFilename(filename);
    return `tenants/${tenantId}/programs/${programId}/sessions/${safeName}`;
  }

  sanitizeFilename(filename: string): string {
    const base = path.posix.basename(filename.trim());
    if (!base || base === "." || base === ".." || base.includes("..")) {
      throw new HttpError(400, "Invalid filename");
    }
    return base;
  }

  /**
   * Ensures the key matches tenants/{tenantId}/programs/{programId}/sessions/{filename}
   * for the current tenant and that the object exists (upload completed).
   */
  async validateSessionMediaObjectKey(
    programId: string,
    objectKey: string,
  ): Promise<void> {
    const tenantId = getTenantId();
    const key = objectKey.trim();
    const prefix = `tenants/${tenantId}/programs/${programId}/sessions/`;
    if (!key.startsWith(prefix)) {
      throw new HttpError(
        400,
        "object_key does not match this tenant and program",
      );
    }
    const remainder = key.slice(prefix.length);
    if (!remainder || remainder.includes("/") || remainder.includes("..")) {
      throw new HttpError(400, "Invalid object key");
    }
    const exists = await this.objectExists(key);
    if (!exists) {
      throw new HttpError(
        400,
        "Media object not found in storage; complete the upload before creating the session",
      );
    }
  }

  async getPresignedPutUrl(
    programId: string,
    filename: string,
    options?: { contentType?: string; expiresInSeconds?: number },
  ): Promise<{ url: string; key: string; expiresIn: number }> {
    await this.ensureBucket();
    const client = this.getClient();
    const bucket = this.bucket ?? this.getBucket();
    const key = this.buildSessionObjectKey(programId, filename);
    const expiresIn = options?.expiresInSeconds ?? DEFAULT_PUT_EXPIRES;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: options?.contentType?.trim() || "application/octet-stream",
    });
    const url = await getSignedUrl(client, command, { expiresIn });
    return { url, key, expiresIn };
  }

  /**
   * Presigned GET URL for streaming private session media (audio or video) in the browser.
   */
  async getMediaPlaybackUrl(
    programId: string,
    filename: string,
    options?: { expiresInSeconds?: number },
  ): Promise<{ url: string; key: string; expiresIn: number }> {
    await this.ensureBucket();
    const client = this.getClient();
    const bucket = this.bucket ?? this.getBucket();
    const key = this.buildSessionObjectKey(programId, filename);
    const expiresIn = options?.expiresInSeconds ?? DEFAULT_GET_EXPIRES;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: "inline",
    });
    const url = await getSignedUrl(client, command, { expiresIn });
    return { url, key, expiresIn };
  }

  async objectExists(key: string): Promise<boolean> {
    const client = this.getClient();
    const bucket = this.bucket ?? this.getBucket();
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch (error: unknown) {
      const err = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (
        err.name === "NotFound" ||
        err.name === "NoSuchKey" ||
        err.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }
}

export default new S3Service();
