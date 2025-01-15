import { createWriteStream } from "fs";
import { IncomingHttpHeaders } from "http";
import https from "https";
import path from "path";

import { md5, textToSlug } from "./str";
import { clearFileName } from "./fs";

export const getUrlHash = (url: string): string => {
  const awsMatch = /amazonaws\.com\/([\w-]+?)\/([\w-]+?)\//gi.exec(url);
  if (awsMatch) return md5(awsMatch[2]);
  return md5(url);
};

export const downloadFileToFolder = (
  url: string,
  name: string,
  downloadFolderPath: string
): Promise<{ filePath: string; fileName: string; fileExt?: string }> =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const { headers } = response;
        const fileExt = getRemoteFileExt(url, headers);
        const fileName = fileExt ? `${name}.${fileExt}` : name;
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

const getRemoteFileExt = (
  url: string,
  headers: IncomingHttpHeaders
): string | undefined => {
  const urlExt = urlToFileExt(url);
  if (urlExt) return urlExt;
  const headersExt = headersToFileExt(headers);
  if (headersExt) return headersExt;
  return undefined;
};

const urlToFileExt = (url: string): string | undefined => {
  const stlReg = /^https:\/\/.+?\.stl.*?$/i;
  if (stlReg.test(url)) return "stl";
  return undefined;
};

const headersToFileExt = (headers: IncomingHttpHeaders): string | undefined => {
  const contentType = headers["content-type"];
  if (!contentType) return;
  const ext = contentType.split("/").pop();
  if (ext === "jpeg") return "jpg";
  if (ext === "quicktime") return "mov";
  return ext;
};

// Converts URL to file title like some-photo-asdf
export const urlToFileName = (url: string, title?: string): string => {
  const urlHash = getUrlHash(url).slice(0, 4);
  const urlFileName = clearFileName(path.basename(url)); // some-photo.jpeg
  const urlExt = path.extname(urlFileName).replace(".", ""); // jpg or ''
  // Title provided
  if (title) {
    let mod = textToSlug(title);
    // Remove extension from title, like JPG
    if (urlExt) mod = mod.replace(new RegExp(`${urlExt}$`), "");
    // Clear file name
    mod = clearFileName(mod);
    return `${mod}-${urlHash}`;
  }
  const urlFileTitle = path.parse(urlFileName).name; // some-photo
  return `${urlFileTitle}-${urlHash}`;
};
