import ffmpeg from "fluent-ffmpeg";
import { createWriteStream } from "fs";
import gm from "gm";
import { IncomingHttpHeaders } from "http";
import https from "https";
import path from "path";

import { clearFileName } from "./fs";
import { textToSlug } from "./str";

/**
 * Download
 */

export const downloadFileToFolder = (
  url: string,
  fileTitle: string,
  downloadFolderPath: string
): Promise<{ filePath: string; fileName: string; fileExt?: string }> =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const { headers } = response;
        const fileExt = headersToFileExt(headers);
        const fileName = fileExt ? `${fileTitle}.${fileExt}` : fileTitle;
        const filePath = path.join(downloadFolderPath, fileName);

        const file = createWriteStream(filePath);
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve({ filePath, fileName, fileExt });
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });

const headersToFileExt = (headers: IncomingHttpHeaders): string | undefined => {
  const contentType = headers["content-type"];
  if (!contentType) return;
  const ext = contentType.split("/").pop();
  if (ext === "jpeg") return "jpg";
  if (ext === "quicktime") return "mov";
  return ext;
};

/**
 * Video
 */

export const convertVideo = async (
  inputFile: string,
  outputFile: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .output(outputFile)
      .on("end", () => {
        resolve();
      })
      .on("error", (err) => {
        reject(err);
      })
      .run();
  });

/**
 * Images
 */

const GraphicsMagick = gm.subClass({ imageMagick: true });

export const convertImage = async (
  inputFile: string,
  outputFile: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    GraphicsMagick(inputFile).write(outputFile, (err) =>
      err ? reject(err) : resolve()
    );
  });

/**
 * Utils
 */

export const assetTitleToFileTitle = (title: string, ext?: string): string => {
  let mod = textToSlug(title);
  // Remove extension from title
  if (ext) mod = mod.replace(new RegExp(`${ext}$`), "");
  // Clear file name
  mod = clearFileName(mod);
  return `${mod}`;
};
