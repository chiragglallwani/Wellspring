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

/** Docker service name `minio` is not resolvable from the user's browser. */
function resolvePublicEndpoint(internalEndpoint: string): string {
  const fromEnv = process.env.S3_PUBLIC_ENDPOINT?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    const internal = new URL(internalEndpoint);
    if (internal.hostname === "minio") {
      const port = internal.port || "9000";
      const publicUrl = `${internal.protocol}//localhost:${port}`;
      logger.info(
        "S3_PUBLIC_ENDPOINT not set; defaulting browser presign host to localhost",
        { internal: internalEndpoint, public: publicUrl },
      );
      return publicUrl;
    }
  } catch {
    // fall through
  }

  return internalEndpoint;
}

function assertBrowserReachablePresignedUrl(
  url: string,
  publicEndpoint: string,
): void {
  let signedHost: string;
  let expectedHost: string;
  try {
    signedHost = new URL(url).hostname;
    expectedHost = new URL(publicEndpoint).hostname;
  } catch {
    return;
  }

  if (signedHost === "minio" || signedHost !== expectedHost) {
    logger.error("Presigned URL uses a host the browser cannot reach", {
      signedHost,
      expectedHost,
      urlPreview: url.slice(0, 120),
    });
    throw new HttpError(
      500,
      "Upload URL misconfigured: set S3_PUBLIC_ENDPOINT=http://localhost:9000 for local development",
    );
  }
}

type StorageEnv = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Reachable from the API process (e.g. `http://minio:9000` in Docker). */
  endpoint: string;
  /** Reachable from the browser for presigned PUT/GET (e.g. `http://localhost:9000`). */
  publicEndpoint: string;
  forcePathStyle: boolean;
};

class S3Service {
  private apiClient: S3Client | null = null;
  private presignClient: S3Client | null = null;
  private bucket: string | null = null;
  private bucketEnsured = false;

  private readEnv(): StorageEnv {
    const bucket = process.env.S3_BUCKET?.trim();
    if (!bucket) {
      throw new HttpError(500, "S3_BUCKET is not configured");
    }

    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID?.trim() ??
      process.env.MINIO_ROOT_USER?.trim();
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY?.trim() ??
      process.env.MINIO_ROOT_PASSWORD?.trim();
    if (!accessKeyId || !secretAccessKey) {
      throw new HttpError(
        500,
        "Object storage credentials are not configured (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY or MINIO_ROOT_USER / MINIO_ROOT_PASSWORD)",
      );
    }

    const endpoint =
      process.env.S3_ENDPOINT?.trim() ||
      (process.env.NODE_ENV === "local" ? "http://127.0.0.1:9000" : undefined);
    if (!endpoint) {
      throw new HttpError(
        500,
        "S3_ENDPOINT is not configured (required for MinIO / S3-compatible storage)",
      );
    }

    const publicEndpoint = resolvePublicEndpoint(endpoint);

    const forcePathStyle =
      process.env.S3_FORCE_PATH_STYLE === "false" ||
      process.env.S3_FORCE_PATH_STYLE === "0"
        ? false
        : true;

    return {
      bucket,
      region: process.env.AWS_REGION?.trim() || "us-east-1",
      accessKeyId,
      secretAccessKey,
      endpoint,
      publicEndpoint,
      forcePathStyle,
    };
  }

  private buildClient(endpoint: string): S3Client {
    const env = this.readEnv();
    const config: S3ClientConfig = {
      region: env.region,
      credentials: {
        accessKeyId: env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
      },
      endpoint,
      forcePathStyle: env.forcePathStyle,
    };
    return new S3Client(config);
  }

  /** Server-side MinIO/S3 client (bucket checks, head object, etc.). */
  private getApiClient(): S3Client {
    if (this.apiClient) {
      return this.apiClient;
    }
    const env = this.readEnv();
    this.apiClient = this.buildClient(env.endpoint);
    this.bucket = env.bucket;
    logger.info("Object storage API client initialized", {
      endpoint: env.endpoint,
      bucket: env.bucket,
      forcePathStyle: env.forcePathStyle,
    });
    return this.apiClient;
  }

  /** Client used only to sign URLs the browser will call. */
  private getPresignClient(): S3Client {
    if (this.presignClient) {
      return this.presignClient;
    }
    const { publicEndpoint, bucket } = this.readEnv();
    this.presignClient = this.buildClient(publicEndpoint);
    this.bucket = bucket;
    logger.info("Object storage presign client initialized", {
      publicEndpoint,
      bucket,
    });
    return this.presignClient;
  }

  private getBucket(): string {
    if (this.bucket) {
      return this.bucket;
    }
    return this.readEnv().bucket;
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) {
      return;
    }

    const client = this.getApiClient();
    const bucket = this.getBucket();

    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      this.bucketEnsured = true;
      return;
    } catch {
      if (process.env.NODE_ENV !== "local") {
        throw new HttpError(500, "Storage bucket is not accessible");
      }
      logger.info("Storage bucket missing, attempting create (local only)", {
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
      logger.error("Failed to ensure storage bucket", {
        bucket,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new HttpError(500, "Unable to access or create storage bucket");
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
    const client = this.getPresignClient();
    const bucket = this.getBucket();
    const key = this.buildSessionObjectKey(programId, filename);
    const expiresIn = options?.expiresInSeconds ?? DEFAULT_PUT_EXPIRES;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: options?.contentType?.trim() || "application/octet-stream",
    });
    const url = await getSignedUrl(client, command, { expiresIn });
    assertBrowserReachablePresignedUrl(
      url,
      this.readEnv().publicEndpoint,
    );
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
    const client = this.getPresignClient();
    const bucket = this.getBucket();
    const key = this.buildSessionObjectKey(programId, filename);
    const expiresIn = options?.expiresInSeconds ?? DEFAULT_GET_EXPIRES;
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: "inline",
    });
    const url = await getSignedUrl(client, command, { expiresIn });
    assertBrowserReachablePresignedUrl(
      url,
      this.readEnv().publicEndpoint,
    );
    return { url, key, expiresIn };
  }

  async objectExists(key: string): Promise<boolean> {
    const client = this.getApiClient();
    const bucket = this.getBucket();
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
