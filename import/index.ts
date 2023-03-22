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
  category?: string;
  series?: string;
  subcategory?: string;
  lang?: string;
  suffix?: string;
  cover?: MdFileDataCover;
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
  const titleMatch = /^# (.+?)\n/g.exec(content);
  if (titleMatch) {
    title = removeMarkdown(titleMatch[1]);
    content = content.replace(titleMatch[0], "");
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
  let category: string | undefined;
  const categoryMatch = /> Category: (.+?)\n/g.exec(content);
  if (categoryMatch) {
    category = categoryMatch[1];
    content = content.replace(categoryMatch[0], "");
  }
  // Subcategory
  let subcategory: string | undefined;
  const subcategoryMatch = /> Subcategory: (.+?)\n/g.exec(content);
  if (subcategoryMatch) {
    subcategory = subcategoryMatch[1];
    content = content.replace(subcategoryMatch[0], "");
  }
  // Series
  let series: string | undefined;
  const seriesMatch = /> Series: (.+?)\n/g.exec(content);
  if (seriesMatch) {
    series = seriesMatch[1];
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
  // Fix image captions
  content = fixImageCaptions(content);
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
    category,
    subcategory,
    series,
    lang,
    suffix,
    cover,
  };
};

const clearContent = (content: string): string => {
  let mod = content;
  // Remove empty lines at the beginning
  mod = mod.replace(/^(?:[\t ]*(?:\r?\n|\r))+/g, "");
  // Remove empty lines between paragraphs
  mod = mod.replace(/\n\n+/gm, "\n\n");
  // Remove empty lines at the end
  mod = mod.replace(/(?:[\t ]*(?:\r?\n|\r))+$/g, "");
  // Remove extra spaces
  mod = mod.replace(/ {2,}/g, " ");
  // Add one empty line at the end
  mod = mod + "\n";
  return mod;
};

const removeMarkdown = (content: string): string => {
  let mod = content;
  // Remove bold and italic
  mod = mod.replace(/\*\*(.+?)\*\*/g, "$1");
  mod = mod.replace(/\*(.+?)\*/g, "$1");
  // Remove links
  mod = mod.replace(/\[(.+?)\]\(.+?\)/g, "$1");
  // Remove images
  mod = mod.replace(/!\[(.+?)\]\(.+?\)/g, "$1");
  // Remove blockquotes
  mod = mod.replace(/^> (.+?)$/gm, "$1");
  // Remove code blocks
  mod = mod.replace(/^```(.+?)```$/gm, "$1");
  // Remove inline code
  mod = mod.replace(/`(.+?)`/g, "$1");
  // Remove extra spaces
  mod = mod.replace(/ {2,}/g, " ");
  // Remove empty lines
  mod = mod.replace(/(?:[\t ]*(?:\r?\n|\r))+/g, "");
  return mod;
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

const fixImageCaptions = (content: string): string => {
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
    const { fileName } = await downloadAssetWithFolder(
      data.cover.image,
      assetsFolder
    );
    data.cover.image = `assets/${fileName}`;
  }
  // Create content
  const frontMatter = mdDataToPostFrontMatter(data);
  let content = frontMatter + "\n\n" + data.content;
  // Download assets
  content = await downloadPostAssets(content, folderPath);
  // Write file
  writeFileSync(filePath, content);
  return filePath;
};

const getPostFolderPath = (data: MdFileData): string => {
  const parts: string[] = [distPath, "blog"];
  if (data.category) parts.push(data.category);
  if (data.subcategory) parts.push(data.subcategory);
  if (data.title) parts.push(titleToSlug(data.title));
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
    const titleStr = data.suffix
      ? `${data.title} | ${data.suffix}`
      : data.title;
    lines.push(`title: "${titleStr}"`);
  }
  if (data.date) {
    lines.push(`date: ${data.date.toISOString()}`);
  }
  lines.push(`lang: "${!!data.lang ? data.lang?.toLowerCase() : "ua"}"`);
  if (data.category) {
    lines.push(`categories:`);
    lines.push(`  - ${firstToUpper(data.category)}`);
  }
  if (data.series) {
    lines.push(`series:`);
    lines.push(`  - "${data.series}"`);
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
  // Download images
  const imgReg = /!\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)/g;
  const matches = content.matchAll(imgReg);
  if (!matches) return content;
  let mod = content;
  const assetsFolder = path.join(folderPath, "assets");
  for (const match of matches) {
    const url = match[1];
    const { fileName } = await downloadAssetWithFolder(url, assetsFolder);
    mod = mod.replace(url, `assets/${fileName}`);
  }
  return mod;
};

// Download file to folder
const downloadAssetWithFolder = async (
  url: string,
  assetsFolder: string
): Promise<{ fileName: string; filePath: string }> =>
  new Promise((resolve, reject) => {
    mkdirp(assetsFolder);
    mkdirp(cachePath);
    const fileName = path.basename(url);
    const filePath = path.join(assetsFolder, fileName);
    if (isFileExists(filePath)) {
      log.trace("File exists already: ", fileName);
      return resolve({ fileName, filePath });
    }
    const cacheFilePath = path.join(cachePath, fileName);
    if (isFileExists(cacheFilePath)) {
      log.trace("File found at the cache: ", fileName);
      copyFileSync(cacheFilePath, filePath);
      return resolve({ fileName, filePath });
    }
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
// Strings
// =====================

const titleToSlug = (title: string): string => {
  let mod = cyrToLat(title).toLowerCase();
  mod = mod.replace(/['’]/g, "");
  mod = mod.replace(/[^a-z0-9]/gi, "-");
  mod = mod.replace(/-+/g, "-");
  mod = mod.replace(/^-|-$/g, "");
  return mod;
};

const cyrToLat = (str: string): string => {
  const a: Record<string, string> = {};
  a["а"] = "a";
  a["А"] = "A";
  a["Б"] = "B";
  a["б"] = "b";
  a["В"] = "V";
  a["в"] = "v";
  a["Г"] = "G";
  a["г"] = "g";
  a["Ґ"] = "G";
  a["ґ"] = "g";
  a["Д"] = "D";
  a["д"] = "d";
  a["Е"] = "E";
  a["е"] = "e";
  a["Ё"] = "YO";
  a["ё"] = "yo";
  a["є"] = "ie";
  a["Є"] = "Ye";
  a["Ж"] = "ZH";
  a["ж"] = "zh";
  a["З"] = "Z";
  a["з"] = "z";
  a["И"] = "I";
  a["и"] = "i";
  a["І"] = "I";
  a["і"] = "i";
  a["ї"] = "i";
  a["Ї"] = "Yi";
  a["Й"] = "I";
  a["й"] = "i";
  a["К"] = "K";
  a["к"] = "k";
  a["Л"] = "L";
  a["л"] = "l";
  a["М"] = "M";
  a["м"] = "m";
  a["Н"] = "N";
  a["н"] = "n";
  a["О"] = "O";
  a["о"] = "o";
  a["П"] = "P";
  a["п"] = "p";
  a["Р"] = "R";
  a["р"] = "r";
  a["С"] = "S";
  a["с"] = "s";
  a["Т"] = "T";
  a["т"] = "t";
  a["У"] = "U";
  a["у"] = "u";
  a["Ф"] = "F";
  a["ф"] = "f";
  a["Х"] = "H";
  a["х"] = "h";
  a["Ц"] = "TS";
  a["ц"] = "ts";
  a["Ч"] = "CH";
  a["ч"] = "ch";
  a["Ш"] = "SH";
  a["ш"] = "sh";
  a["Щ"] = "SCH";
  a["щ"] = "sch";
  a["Ъ"] = "'";
  a["ъ"] = "'";
  a["Ы"] = "I";
  a["ы"] = "i";
  a["Ь"] = "'";
  a["ь"] = "'";
  a["Э"] = "E";
  a["э"] = "e";
  a["Ю"] = "YU";
  a["ю"] = "yu";
  a["Я"] = "Ya";
  a["я"] = "ya";
  return str
    .split("")
    .map((char) => a[char] || char)
    .join("");
};

const firstToUpper = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

// =====================
// File system
// =====================

const mkdirp = (folderPath: string) =>
  mkdirSync(folderPath, { recursive: true });

const listFilesInFolder = (
  folderPath: string,
  extensions?: string[]
): string[] => {
  const res: string[] = [];
  const items = readdirSync(folderPath);
  for (const item of items) {
    const itemPath = path.resolve(folderPath, item);
    const stat = statSync(itemPath);
    if (stat.isDirectory()) {
      const newItems = listFilesInFolder(itemPath, extensions);
      res.push(...newItems);
    } else if (isFileExtensionInList(itemPath, extensions)) {
      res.push(itemPath);
    }
  }
  return res;
};

const isFileExtensionInList = (
  filePath: string,
  extensions?: string[]
): boolean => {
  if (!extensions) return true;
  const ext = path.extname(filePath);
  if (!ext) return false;
  return extensions.includes(ext.substring(1).toLocaleLowerCase());
};

// Is file exists
const isFileExists = (filePath: string): boolean => {
  try {
    accessSync(filePath);
    return true;
  } catch (err) {
    return false;
  }
};

// =====================
// Log
// =====================

const log = {
  trace: (...args: unknown[]) => console.log("[*]:", ...args),
  debug: (...args: unknown[]) => console.log("[-]:", ...args),
  info: (...args: unknown[]) => console.log("[+]:", ...args),
  err: (...args: unknown[]) => console.log("[x]:", ...args),
};

// =====================
// Run
// =====================

run().catch((err) => log.err(err));
