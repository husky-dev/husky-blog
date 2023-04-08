/**
 * Markdown file data
 */

export interface MdFileData {
  slug: string;
  date?: Date;
  title?: string;
  lang?: string;
  cover?: MdFileDataCover;
  series?: string[];
  categories?: string[];
  tags?: string[];
  content: string;
}

export interface MdFileDataCover {
  image: string;
  caption?: string;
}

/**
 * Front matter
 */

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
export const getFrontMatter = (data: MdFileData): string => {
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

/**
 * YouTube
 */

export const modYoutubeEmbeds = (content: string): string => {
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

/**
 * Assets
 */

export interface AssetEntry {
  raw: string;
  url: string;
  caption?: string;
}

/**
 * Images
 */

export const modImageCaptions = (content: string): string => {
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

export type ImageEntry = AssetEntry;

export const getImageEntries = (md: string): ImageEntry[] => {
  const reg = /!\[([^\]]*)\]\((.*?)\s*("(?:.*[^"])")?\s*\)/g;
  const matches = md.matchAll(reg);
  if (!matches) return [];
  const items: ImageEntry[] = [];
  for (const match of matches) {
    const alt = match[1];
    const url = match[2];
    const title = match[3];
    const caption = title || alt;
    const raw = match[0];
    items.push({ raw, url, caption });
  }
  return items;
};

/**
 * PDF
 */

export type PdfEntry = AssetEntry;

export const getPdfEntries = (md: string): PdfEntry[] => {
  const reg = /\[([^\]]*)\]\((.*?.pdf)\s*("(?:.*[^"])")?\s*\)/g;
  const matches = md.matchAll(reg);
  if (!matches) return [];
  const items: PdfEntry[] = [];
  for (const match of matches) {
    const raw = match[0];
    const alt = match[1];
    const url = match[2];
    const title = match[3] ? match[3].replace(/(^"|"$)/gm, "") : undefined;
    const caption = title || alt;
    items.push({ raw, url, caption });
  }
  return items;
};

/**
 * Video
 */

export interface VideoEntry extends AssetEntry {
  formats: {
    mov?: string;
    mp4?: string;
  };
}

export const getVideoEntries = (md: string): VideoEntry[] => {
  const reg = /\[([^\]]*)\]\((.*?.(mov|mp4))\s*("(?:.*[^"])")?\s*\)/g;
  const matches = md.matchAll(reg);
  if (!matches) return [];
  const items: VideoEntry[] = [];
  for (const match of matches) {
    const raw = match[0];
    const alt = match[1];
    const url = match[2];
    const ext = match[3];
    const mov = ext === "mov" ? url : undefined;
    const mp4 = ext === "mp4" ? url : undefined;
    const title = match[4] ? match[4].replace(/(^"|"$)/gm, "") : undefined;
    const caption = title || alt;
    items.push({ raw, caption, url, formats: { mov, mp4 } });
  }
  return items;
};
