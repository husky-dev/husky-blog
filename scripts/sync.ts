import { resolve as resolvePath } from "path";
import { listFilesInFolder, log } from "./utils";
import { getFileS3Url, isFileExistsAtS3, uploadFileToS3 } from "./s3";

const curFolder = resolvePath(__dirname);
const publicFolder = resolvePath(curFolder, "..", "public");

const main = async () => {
  log.info("Syncing...");
  log.debug("public=", publicFolder);
  const filePaths = listFilesInFolder(publicFolder);
  log.info(`Found ${filePaths.length} files`);
  // Split by 10 to avoid too many requests
  for (let i = 0; i < filePaths.length; i += 10) {
    const files = filePaths.slice(i, i + 10);
    await Promise.all(files.map(syncFile));
  }
  log.info("Done");
};

const syncFile = async (filePath: string) => {
  const relativePath = filePath.replace(publicFolder + "/", "");
  const isExists = await isFileExistsAtS3(relativePath);
  if (isExists) {
    return log.info(`"${relativePath}" is already at S3`);
  } else {
    log.info(`"${relativePath}" is not at S3. Uploading...`);
    await uploadFileToS3(filePath, relativePath);
  }
};

main();
