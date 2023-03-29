import {
  accessSync,
  copyFileSync,
  createWriteStream,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlink,
  unlinkSync,
  writeFileSync,
} from "fs";
import * as path from "path";
import https from "https";
import {
  clearContent,
  firstToUpper,
  isFileExists,
  listFilesInFolder,
  log,
  md5,
  mkdirp,
  removeMarkdown,
  textToSlug,
  urlToFileName,
} from "./utils";

const srcPath = path.join(__dirname, "content");
const distPath = path.join(__dirname, "../content");
const cachePath = path.join(__dirname, ".cache");

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

interface MdFileData {
  date?: Date;
  title?: string;
  lang?: string;
  cover?: MdFileDataCover;
  series?: string[];
  categories?: string[];
  tags?: string[];
  content: string;
}

interface MdFileDataCover {
  image: string;
  caption?: string;
}

const readMdFielData = (filePath: string): MdFileData | undefined => {
  let content = readFileSync(filePath, "utf8");
  if (!content) return undefined;
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
  // Suffix
  let suffix: string | undefined;
  const suffixMatch = /> Suffix: (.+?)\n/g.exec(content);
  if (suffixMatch) {
    suffix = suffixMatch[1];
    content = content.replace(suffixMatch[0], "");
  }
  // Clear
  content = clearContent(content);
  // Format content
  content = changeImageCaptions(content);
  content = changeYoutubeEmbeds(content);
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

const changeImageCaptions = (content: string): string => {
  let mod = content;
  const imgWithCaptionReg =
    /!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)\n\n\*\*(.+?)\*\*/g;
  const matches = mod.matchAll(imgWithCaptionReg);
  for (const match of matches) {
    const image = match[1];
    const caption = match[3].replace(/"/gm, '\\"');
    const newImg = `![${caption}](${image} "${caption}")`;
    mod = mod.replace(match[0], newImg);
  }
  return mod;
};

const changeYoutubeEmbeds = (content: string): string => {
  const reg =
    /\n\[(.*?)\]\((?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})\)\n/g;
  const matches = content.matchAll(reg);
  let mod = content;
  for (const match of matches) {
    const title = match[1];
    const id = match[2];
    const newEmbed = `\n{{< youtube id="${id}" title="${title}" >}}\n`;
    mod = mod.replace(match[0], newEmbed);
  }
  return mod;
};

// =====================
// Export
// =====================

const createPostWithMdData = async (data: MdFileData): Promise<string> => {
  const folderPath = getPostFolderPath(data);
  const filePath = path.join(folderPath, "index.md");
  // Create folder
  mkdirp(folderPath);
  // Dowload cover
  if (data.cover) {
    const assetsFolder = path.join(folderPath, "assets");
    const { fileName } = await downloadAssetToFolder(
      data.cover.image,
      data.cover.caption || "",
      assetsFolder
    );
    data.cover.image = `assets/${fileName}`;
  }
  // Create content
  const frontMatter = mdDataToPostFrontMatter(data);
  let mod = frontMatter + "\n\n" + data.content;
  // Download assets
  mod = await downloadPostAssets(mod, folderPath);
  // Write file
  writeFileSync(filePath, mod);
  return filePath;
};

const getPostFolderPath = (data: MdFileData): string => {
  const parts: string[] = [distPath, "blog"];
  if (data.title) parts.push(textToSlug(data.title));
  return path.join(...parts);
};

/**
 * Returns front matter data as string
 *
 * @example
 * ---
 * title: "День первый | 🇹🇿 Поход на вершину Килиманджаро"
 * date: 2021-07-15T13:21:00+03:00
 * draft: false
 * # cover:
 * #     image: "images/weight-loss-results.jpg"
 * #     alt: "Зкидання ваги"
 * #     caption: "Трохи пропотів"
 * categories:
 *   - Travel
 *   - Kilimanjaro
 * ---
 */
const mdDataToPostFrontMatter = (data: MdFileData): string => {
  const lines: string[] = ["---"];
  if (data.title) {
    lines.push(`title: "${data.title}"`);
  }
  if (data.date) {
    lines.push(`date: ${data.date.toISOString()}`);
  }
  lines.push(`lang: "${!!data.lang ? data.lang?.toLowerCase() : "ua"}"`);
  if (data.categories) {
    lines.push(`categories:`);
    for (const category of data.categories) {
      lines.push(`  - ${category.toLocaleLowerCase()}`);
    }
  }
  if (data.tags) {
    lines.push(`tags:`);
    for (const tag of data.tags) {
      lines.push(`  - ${tag.toLocaleLowerCase()}`);
    }
  }
  if (data.series) {
    lines.push(`series:`);
    for (const itm of data.series) {
      lines.push(`  - "${itm}"`);
    }
  }
  if (data.cover) {
    lines.push("cover:");
    lines.push(`  image: "${data.cover.image}"`);
    if (data.cover.caption) {
      lines.push(`  caption: "${data.cover.caption}"`);
    }
  }
  lines.push("draft: false");
  lines.push("---");
  return lines.join("\n");
};

// Download asssets with folder
const downloadPostAssets = async (
  content: string,
  folderPath: string
): Promise<string> => {
  let mod = content;
  const assetsFolder = path.join(folderPath, "assets");
  // Download images
  const imgReg = /!\[([^\]]*)\]\((.*?)\s*("(?:.*[^"])")?\s*\)/g;
  const imgMatches = content.matchAll(imgReg);
  if (imgMatches) {
    for (const match of imgMatches) {
      const alt = match[1];
      const url = match[2];
      const caption = match[3];
      const title = caption || alt;
      const { fileName } = await downloadAssetToFolder(
        url,
        title,
        assetsFolder
      );
      mod = mod.replace(url, `assets/${fileName}`);
    }
  }
  // Download PDFs
  const pdfReg = /\[([^\]]*)\]\((.*?.pdf)\s*("(?:.*[^"])")?\s*\)/g;
  const pdfMatches = content.matchAll(pdfReg);
  if (pdfMatches) {
    for (const match of pdfMatches) {
      const alt = match[1];
      const url = match[2];
      const caption = match[3];
      const title = caption || alt;
      const { fileName } = await downloadAssetToFolder(
        url,
        title,
        assetsFolder
      );
      mod = mod.replace(url, `assets/${fileName}`);
    }
  }
  return mod;
};

// Download file to folder

const downloadAssetToFolder = async (
  url: string,
  title: string | undefined,
  assetsFolder: string
): Promise<{ fileName: string; filePath: string }> =>
  new Promise((resolve, reject) => {
    const fileName = urlToFileName(url);
    // Chek if file exists
    const filePath = path.join(assetsFolder, fileName);
    mkdirp(assetsFolder);
    if (isFileExists(filePath)) {
      log.trace("File exists already: ", fileName);
      return resolve({ fileName, filePath });
    }
    // Check if file exists in cache
    const cacheFileName = md5(url);
    const cacheFilePath = path.join(cachePath, cacheFileName);
    mkdirp(cachePath);
    if (isFileExists(cacheFilePath)) {
      log.trace("File found at the cache: ", fileName);
      copyFileSync(cacheFilePath, filePath);
      return resolve({ fileName, filePath });
    }
    // Download file
    log.info("Downloading asset: ", url);
    const file = createWriteStream(cacheFilePath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          copyFileSync(cacheFilePath, filePath);
          resolve({ fileName, filePath });
        });
      })
      .on("error", (err) => {
        unlinkSync(filePath);
        reject(err);
      });
  });

// =====================
// Run
// =====================

run().catch((err) => log.err(err));
