import { S3 } from "aws-sdk";
import { createReadStream } from "fs";
import path from "path";

import { conf } from "./conf";

const s3 = new S3({
  endpoint: `https://${conf.r2.accountId}.r2.cloudflarestorage.com`,
  accessKeyId: conf.r2.accessKeyId,
  secretAccessKey: conf.r2.secretAccessKey,
  signatureVersion: "v4",
});

export const isFileExistsAtS3 = async (fileKey: string): Promise<boolean> => {
  try {
    const s3Key = getFileS3Key(fileKey);
    await s3.headObject({ Bucket: conf.r2.staticBucket, Key: s3Key }).promise();
    return true;
  } catch (err) {
    return false;
  }
};

export const uploadFileToS3 = async (filePath: string, fileKey: string) => {
  const s3Key = getFileS3Key(fileKey);
  const fileStream = createReadStream(filePath);
  const contentType = fileNameToMimeType(fileKey);
  await s3
    .upload({
      Bucket: conf.r2.staticBucket,
      Key: s3Key,
      ContentType: contentType,
      Body: fileStream,
    })
    .promise();
  return getFileS3Url(fileKey);
};

export const getFileS3Url = (fileKey: string): string =>
  conf.r2.staticUrl + "/" + getFileS3Key(fileKey);

const getFileS3Key = (fileKey: string): string =>
  conf.r2.prefix ? `${conf.r2.prefix}/${fileKey}` : fileKey;

const fileNameToMimeType = (fileName: string): string => {
  const ext = path.extname(fileName).replace(".", "").toLocaleLowerCase();
  if (!ext) return "application/octet-stream";

  if (ext === "jpg") return "image/jpeg";
  if (ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "mov") return "video/quicktime";
  if (ext === "qt") return "video/quicktime";
  if (ext === "mp4") return "video/mp4";
  if (ext === "pdf") return "application/pdf";
  if (ext === "zip") return "application/zip";
  if (ext === "json") return "application/json";
  if (ext === "csv") return "text/csv";
  if (ext === "heic") return "image/heic";
  if (ext === "html") return "text/html";
  if (ext === "css") return "text/css";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "ico") return "image/x-icon";
  if (ext === "js") return "application/javascript";
  if (ext === "xml") return "application/xml";
  if (ext === "webmanifest") return "application/manifest+json";
  if (ext === "stl") return "application/octet-stream"; // application/xml

  throw new Error(`Unknown file extension: ${ext}`);
};
