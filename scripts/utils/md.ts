/**
 * Content
 */

import { textToSlug } from "./str";

export const clearMdContent = (content: string): string => {
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

/**
 * Frontmatter
 */

interface MdFrontmatter {
  sidebar_position?: number;
  sidebar_label?: string;
}

export const getMdFrontmatter = (frontmatter: MdFrontmatter): string => {
  const lines: string[] = [];
  lines.push("---");
  if (frontmatter.sidebar_position !== undefined) {
    lines.push(`sidebar_position: ${frontmatter.sidebar_position}`);
  }
  if (frontmatter.sidebar_label !== undefined) {
    lines.push(`sidebar_label: "${frontmatter.sidebar_label}"`);
  }
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
    const newEmbed = getYouTubeEmbedded(id, title);
    mod = mod.replace(match[0], newEmbed);
  }
  return mod;
};

const getYouTubeEmbedded = (id: string, title: string): string => `
<p>
<div class="proportional-box">
<iframe
  src="https://www.youtube.com/embed/${id}"
  width="100%"
  height="100%"
  frameborder="0"
  allow="autoplay; encrypted-media"
  allowfullscreen>
</iframe>
</div>
</p>
`;

/**
 * Admonitions
 */

export const modAdmonitions = (content: string): string => {
  let mod = content;
  const lines = mod.split("\n");
  let body: string[] | undefined = undefined;
  for (const line of lines) {
    if (getAdmotionStartLineEmoji(line)) {
      body = [line];
      continue;
    }
    if (/^[\t\s]*?> /g.test(line) && body) {
      body.push(line);
      continue;
    }
    if (body && body.length > 0) {
      const emoji = getAdmotionStartLineEmoji(body[0]);
      if (!emoji) continue;
      const header = addmotionEmojyToHeader(emoji);
      const admotionContent = body
        .map((l) =>
          l
            .replace(/^[\t\s]*?> /g, "")
            .replace(new RegExp(`^${emoji}\\s+`), "")
            .trim()
        )
        .join("\n");
      const admotionBlock = `:::${header}\n\n${admotionContent}\n\n:::\n`;
      mod = mod.replace(body.join("\n"), admotionBlock);
      body = undefined;
    }
  }
  return mod;
};

const getAdmotionStartLineEmoji = (line: string): string | undefined => {
  const match = /^[\t\s]*?> (⛔|🚨|☝|👉|💡|⚠️|✅|🔥|ℹ️|💰|🚫|👇|👀)/g.exec(
    line
  );
  return match ? match[1] : undefined;
};

const addmotionEmojyToHeader = (val: string): string => {
  switch (val) {
    case "🚫":
    case "⛔":
    case "🚨":
      return "danger[Увага]";
    case "⚠️":
    case "☝":
    case "🔥":
    case "👀":
      return "warning[Важливо]";
    case "👉":
    case "💡":
    case "ℹ️":
    case "💰":
    case "👇":
      return "info[Примітка]";
    case "✅":
      return "tip[Примітка]";
    default:
      return "note";
  }
};

/**
 * Bookmarks
 */

export const modBookmarks = (content: string): string => {
  const reg = /\[bookmark\]\(([\s\S]+?)\)/gi;
  const matches = content.matchAll(reg);
  let mod = content;
  for (const match of matches) {
    const url = match[1];
    const code = `[${url}](${url})`;
    mod = mod.replace(match[0], code);
  }
  return mod;
};

/**
 * Google docs
 */

export const modGoogleDocs = (content: string): string => {
  let mod = content;
  mod = modGoogleDocsComponentsTable(mod);
  return mod;
};

const modGoogleDocsComponentsTable = (content: string): string => {
  const reg =
    /\[(Відкрити таблицю в новому вікні)\]\((.+?1Rlx2jzESQMX-LS-CdXkk9qfsO2DpkuWfHqD8TZ6WA4Y.+?)\)/gi;
  const matches = content.matchAll(reg);
  let mod = content;
  for (const match of matches) {
    const title = match[1];
    const url = match[2];
    const code = `[${title}](${url})\n\n${getGoogleSpreadsheetEmbedding(
      "1Rlx2jzESQMX-LS-CdXkk9qfsO2DpkuWfHqD8TZ6WA4Y"
    )}`;
    mod = mod.replace(match[0], code);
  }
  return mod;
};

const getGoogleSpreadsheetEmbedding = (id: string): string => `
<iframe
  style={{width: '100%', height: '600px', borderRadius: '1px', pointerEvents: 'auto', backgroundColor: 'rgb(25, 25, 25)'}}
  src="https://docs.google.com/spreadsheets/d/${id}/preview?usp=embed_googleplus"
  frameborder="0"
  sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation allow-forms allow-same-origin allow-storage-access-by-user-activation allow-popups-to-escape-sandbox"
  allowfullscreen="">
</iframe>
`;

/**
 * STL
 */

export const modStl = (content: string): string => {
  const reg = /\[([^\]]*)\]\((.*?\.stl.*?)\)/gi;
  const matches = content.matchAll(reg);
  let mod = content;
  for (const match of matches) {
    if (mod.indexOf(`import { EmbeddedStlViewer }`) === -1) {
      mod = `import { EmbeddedStlViewer } from "@site/src/components/Layout"\n\n${mod}`;
    }
    const url = match[2];
    const urlPropVal = url.startsWith("http")
      ? `"${url}"`
      : `{require("./${url}").default}`;
    const code = `<p className="stl-viewer-wrap"><EmbeddedStlViewer url=${urlPropVal}/></p>`;
    mod = mod.replace(match[0], code);
  }
  return mod;
};

/**
 * Headers
 */

export const addHeadersAnchorIds = (content: string): string => {
  const reg = /^#{1,6} (.+)$/gm;
  const lines = content.split("\n");
  let isCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      isCodeBlock = !isCodeBlock;
    }
    if (isCodeBlock) continue;
    const match = reg.exec(line);
    if (!match) continue;
    const header = match[1];
    const id = textToSlug(header);
    lines[i] = `${line} {#${id}}`;
  }
  return lines.join("\n");
};

/**
 * Utils
 */

/**
 * Get media caption like **Caption** below the media code and add it
 * to the media code as title attribute
 */
export const modMediaCaptions = (content: string): string => {
  let mod = content;
  const mediaWithCaptionReg =
    /(!*)\[[^\]]*\]\((.*?)\s*("(?:.*[^"])")?\s*\)\n+_\*\*(.+?)\*\*_/g;
  const matches = mod.matchAll(mediaWithCaptionReg);
  for (const match of matches) {
    const isImg = match[0].startsWith("!"); // image or video
    const src = match[2];
    const caption = match[4].replace(/"/g, "");
    const newCode = isImg ? `![${caption}](${src})` : `[${caption}](${src})`;
    mod = mod.replace(match[0], newCode);
  }
  return mod;
};
