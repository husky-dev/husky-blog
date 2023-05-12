import {
  copyFileSync,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import path from "path";

import {
  AssetEntry,
  assetTitleToFileTitle,
  clearContent,
  clearFileName,
  convertImage,
  convertVideo,
  createVideoScreenshot,
  downloadFileToFolder,
  getFileHash,
  getFrontMatter,
  getImageEntries,
  getPdfEntries,
  getVideoEntries,
  listFilesInFolder,
  log,
  md5,
  MdFileData,
  MdFileDataCover,
  mkdirp,
  modMediaCaptions,
  modYoutubeEmbeds as modYoutubeEntries,
  removeMarkdown,
  textToSlug,
} from "./utils";

const srcPath = path.join(__dirname, "content");
const distPath = path.join(__dirname, "../content");
const cachePath = path.join(__dirname, ".cache");
const cachePostersPath = path.join(cachePath, "posters");
mkdirp(cachePath);
mkdirp(cachePostersPath);

// =====================
// Main
// =====================

const run = async () => {
  log.info("Start");
  log.debug("Source path:", srcPath);
  log.debug("Destination path:", distPath);
  const filePaths = listFilesInFolder(srcPath, ["md"]);
  log.info("Files found:", filePaths.length);
  for (const filePath of filePaths) {
    log.info("Processing file:", filePath);
    const data = readMdFielData(filePath);
    if (data) {
      const newFilePath = await createPostWithMdData(data);
      log.info("File processed:", newFilePath);
    } else {
      log.err("File parsing error:", filePath);
    }
  }
  log.info("Done");
};

// =====================
// Import
// =====================

const readMdFielData = (filePath: string): MdFileData | undefined => {
  let content = readFileSync(filePath, "utf8");
  if (!content) return undefined;
  const fileTitle = path.parse(filePath).name;
  // Title
  let title: string | undefined;
  // H1 title
  const h1TitleMatch = /^# (.+?)\n/g.exec(content);
  if (h1TitleMatch) {
    title = removeMarkdown(h1TitleMatch[1]);
    content = content.replace(h1TitleMatch[0], "");
  }
  // Frontmatter title
  const frontmatterTitleMatch = /> Title: (.+?)\n/g.exec(content);
  if (frontmatterTitleMatch) {
    title = removeMarkdown(frontmatterTitleMatch[1]);
    content = content.replace(frontmatterTitleMatch[0], "");
  }
  // Title slug
  const titleSlug = textToSlug(title ? title : fileTitle);
  // Date
  let date: Date | undefined;
  const dateMatch = /> Date: (.+?)\n/g.exec(content);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate;
      content = content.replace(dateMatch[0], "");
    }
  }
  // Category
  let categories: string[] | undefined;
  const categoriesMatch = /> Category: (.+?)\n/g.exec(content);
  if (categoriesMatch) {
    categories = categoriesMatch[1].split(",").map((t) => t.trim());
    content = content.replace(categoriesMatch[0], "");
  }
  // Tags
  let tags: string[] | undefined;
  const tagsMatch = /> Tags: (.+?)\n/g.exec(content);
  if (tagsMatch) {
    tags = tagsMatch[1].split(",").map((t) => t.trim());
    content = content.replace(tagsMatch[0], "");
  }
  // Series
  let series: string[] | undefined;
  const seriesMatch = /> Series: (.+?)\n/g.exec(content);
  if (seriesMatch) {
    series = seriesMatch[1].split(",").map((t) => t.trim());
    content = content.replace(seriesMatch[0], "");
  }
  // Language
  let lang: string | undefined;
  const langMatch = /> Language: (.+?)\n/g.exec(content);
  if (langMatch) {
    lang = langMatch[1];
    content = content.replace(langMatch[0], "");
  }
  // Slug
  let slug: string | undefined;
  const slugMatch = /> Slug: (.+?)\n/g.exec(content);
  if (slugMatch) {
    slug = slugMatch[1];
    content = content.replace(slugMatch[0], "");
  }
  // Original
  let original: string | undefined;
  const originalMatch = /> Original: (.+?)\n/g.exec(content);
  if (originalMatch) {
    original = originalMatch[1];
    content = content.replace(originalMatch[0], "");
  }
  // Clear
  content = clearContent(content);
  // Format content
  content = modMediaCaptions(content);
  // Cover
  let cover: MdFileDataCover | undefined;
  const coverMatch = contentToCover(content);
  if (coverMatch) {
    cover = coverMatch.data;
    content = coverMatch.content;
  }
  // Final clear
  content = clearContent(content);
  return {
    slug: slug ? slug : titleSlug,
    title,
    content,
    date,
    categories,
    series,
    lang,
    tags,
    cover,
  };
};

/**
 * Extract first image from content and return it as cover
 * @param content - Markdown content
 * @returns - Cover data and content without cover
 */
const contentToCover = (
  content: string
): { data: MdFileDataCover; content: string } | undefined => {
  const lines = content.split("\n");
  if (!lines.length) return undefined;
  const imgReg = /!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/g;
  const imgMatch = imgReg.exec(lines[0]);
  if (!imgMatch) return undefined;
  const image = imgMatch[1];
  let caption: string | undefined;
  if (imgMatch[2]) {
    caption = imgMatch[2].replace(/"/g, "");
  }
  const newContent = lines.slice(1).join("\n");
  return { data: { image, caption }, content: newContent };
};

// =====================
// Export
// =====================

const createPostWithMdData = async (data: MdFileData): Promise<string> => {
  const postFolderPath = path.join(distPath, "posts", data.slug);
  const filePath = path.join(postFolderPath, "index.md");
  // Create folder
  mkdirp(postFolderPath);
  mkdirp(path.join(postFolderPath, "assets"));
  // Dowload cover
  if (data.cover) {
    const assetsFolder = path.join(postFolderPath, "assets");
    const { fileName } = await downloadAsset(
      data.cover.image,
      data.cover.caption || "",
      assetsFolder
    );
    data.cover.image = `assets/${fileName}`;
  }
  // Create front metter
  const frontMatter = getFrontMatter(data);
  let mod = frontMatter + "\n\n" + data.content;
  // Download assets
  mod = await downloadPostAssets(mod, postFolderPath);
  // Post process content after assets download
  mod = modYoutubeEntries(mod);
  mod = await modVideoEntries(mod, postFolderPath);
  // Write file
  writeFileSync(filePath, mod);
  return filePath;
};

// Download asssets with folder
const downloadPostAssets = async (
  content: string,
  folderPath: string
): Promise<string> => {
  let mod = content;
  const assetsFolder = path.join(folderPath, "assets");
  mkdirp(assetsFolder);
  const assetEntries: AssetEntry[] = [
    ...getImageEntries(mod),
    ...getPdfEntries(mod),
    ...getVideoEntries(mod),
  ];
  for (const entry of assetEntries) {
    const { fileName } = await downloadAsset(
      entry.url,
      entry.caption,
      assetsFolder
    );
    mod = mod.replace(entry.url, `assets/${fileName}`);
  }
  return mod;
};

// Download file to folder

const downloadAsset = async (
  url: string,
  title: string | undefined,
  assetsFolder: string
): Promise<{ fileName: string }> => {
  // File name extracted from url
  const urlFileName = clearFileName(path.basename(url)); // some-photo.jpeg
  // Use passed title if it is possible
  const fileTitle = !!title
    ? assetTitleToFileTitle(title, url)
    : path.parse(urlFileName).name; // some-photo
  // Chek if file exists
  const exAssetsFolderFiles = listFilesInFolder(assetsFolder);
  const exAssetsFilePath = exAssetsFolderFiles.find((name) =>
    name.includes(fileTitle)
  );
  if (exAssetsFilePath) {
    const fileName = path.basename(exAssetsFilePath);
    log.debug("File exists already: ", fileName);
    return { fileName };
  }
  // Check if file exists in cache
  const cacheFileTitle = md5(url);
  const exCacheFiles = listFilesInFolder(cachePath);
  const exCacheFilePath = exCacheFiles.find((name) =>
    name.includes(cacheFileTitle)
  );
  if (exCacheFilePath) {
    // Gettitn file extension which was was found at the cache
    const exChacheFileExt = path.extname(exCacheFilePath).replace(".", "");
    // And use it for the new file
    const fileName = exChacheFileExt
      ? `${fileTitle}.${exChacheFileExt}`
      : fileTitle;
    const filePath = path.join(assetsFolder, fileName);
    log.debug("File found at the cache: ", fileName);
    copyFileSync(exCacheFilePath, filePath);
    return { fileName };
  }
  // Download file
  log.info("Downloading asset: ", url);
  const downloadRes = await downloadFileToFolder(
    url,
    cacheFileTitle,
    cachePath
  );
  let newCacheFileExt = downloadRes.fileExt;
  let newCacheFilePath = downloadRes.filePath;

  // Convert tiff to jpg
  if (
    !!newCacheFileExt &&
    ["tiff", "tif", "octet-stream"].includes(newCacheFileExt)
  ) {
    const cacheFileConvPath = path.join(cachePath, `${cacheFileTitle}.jpg`);
    await convertImage(newCacheFilePath, cacheFileConvPath);
    unlinkSync(newCacheFilePath);
    newCacheFileExt = "jpg";
    newCacheFilePath = cacheFileConvPath;
  }

  const fileName = `${fileTitle}.${newCacheFileExt}`;
  const filePath = path.join(assetsFolder, fileName);
  copyFileSync(newCacheFilePath, filePath);
  return { fileName };
};

// =====================
// Video
// =====================

const modVideoEntries = async (
  content: string,
  postFolderPath: string
): Promise<string> => {
  let mod = content;
  const entries = getVideoEntries(content);
  for (const entry of entries) {
    const { formats, caption, url } = entry;
    const assetPath = path.join(postFolderPath, url);
    const props: string[] = [];
    if (formats.mov) {
      props.push(`mov="${formats.mov}"`);
    } else {
      const movFilePath = await convertVideoAsset(assetPath, "mov");
      const mov = path.relative(postFolderPath, movFilePath);
      props.push(`mov="${mov}"`);
    }
    if (formats.mp4) {
      props.push(`mp4="${formats.mp4}"`);
    } else {
      const mp4FilePath = await convertVideoAsset(assetPath, "mp4");
      const mp4 = path.relative(postFolderPath, mp4FilePath);
      props.push(`mp4="${mp4}"`);
    }
    // Poster
    const posterFilePath = await getVideoPoster(assetPath);
    props.push(`poster="${path.relative(postFolderPath, posterFilePath)}"`);
    // Caption
    if (caption) props.push(`caption="${caption}"`);
    const video = `{{< video ${props.join(" ")} >}}`;
    mod = mod.replace(entry.raw, video);
  }
  return mod;
};

const convertVideoAsset = async (
  inputFilePath: string,
  format: string
): Promise<string> => {
  const inputFileExt = path.extname(inputFilePath).replace(".", "");
  const inputFileName = path.basename(inputFilePath, `.${inputFileExt}`);
  const inputFileFolderPath = path.dirname(inputFilePath);
  const inputFileHash = await getFileHash(inputFilePath);
  const outputFilePath = path.join(
    inputFileFolderPath,
    `${inputFileName}.${format}`
  );
  if (existsSync(outputFilePath)) {
    log.debug("Converted video asset founded: ", inputFilePath, format);
    return outputFilePath;
  }
  const cacheFilePath = path.join(cachePath, `${inputFileHash}.${format}`);
  if (!existsSync(cacheFilePath)) {
    log.debug("Converting video asset: ", inputFilePath, format);
    await convertVideo(inputFilePath, cacheFilePath);
  } else {
    log.debug(
      "Converted video asset founded at cache: ",
      inputFilePath,
      format
    );
  }
  copyFileSync(cacheFilePath, outputFilePath);
  return outputFilePath;
};

const getVideoPoster = async (inputFilePath: string): Promise<string> => {
  const inputFileExt = path.extname(inputFilePath).replace(".", ""); // mp4
  const inputFileName = path.basename(inputFilePath, `.${inputFileExt}`); // video
  const inputFileFolderPath = path.dirname(inputFilePath); // /path/to/post
  const inputFileHash = await getFileHash(inputFilePath); // 1234567890
  const outputFilePath = path.join(inputFileFolderPath, `${inputFileName}.jpg`); // /path/to/post/video.jpg
  if (existsSync(outputFilePath)) {
    log.debug("Video poster found: ", outputFilePath);
    return outputFilePath;
  }
  const cacheFilePath = path.join(cachePostersPath, `${inputFileHash}.jpg`); // /path/to/cache/1234567890.jpg
  if (!existsSync(cacheFilePath)) {
    log.debug("Creating video poster: ", inputFilePath);
    await createVideoScreenshot(inputFilePath, cacheFilePath);
  } else {
    log.debug("Video poster founded at cache");
  }
  copyFileSync(cacheFilePath, outputFilePath);
  return outputFilePath;
};

// =====================
// Run
// =====================

run().catch((err) => log.err(err));
