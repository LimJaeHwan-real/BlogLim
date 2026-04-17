import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BLOG_BASE_URL = "https://forrest7.tistory.com";
const CUTOFF_DATE = new Date("2026-03-01T00:00:00+09:00");
const MAX_CATEGORY_PAGES = 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, "..", "_posts");

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value = "") {
  return decodeHtml(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function yamlQuote(value = "") {
  return JSON.stringify(String(value));
}

function slugifyTitle(title, id) {
  const slug = decodeHtml(title)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/[\[\]{}()!.,]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return slug || `post-${id}`;
}

function normalizeAssetUrl(rawUrl) {
  const decoded = decodeHtml(rawUrl || "").trim();
  if (!decoded) {
    return "";
  }

  try {
    const resolved = new URL(decoded, BLOG_BASE_URL);
    const originalUrl = resolved.searchParams.get("fname");
    const target = originalUrl ? decodeURIComponent(originalUrl) : resolved.toString();
    const targetUrl = new URL(target, BLOG_BASE_URL);

    if (targetUrl.hostname.endsWith("kakaocdn.net")) {
      targetUrl.search = "";
    }

    return targetUrl.toString();
  } catch (error) {
    return decoded;
  }
}

function extractMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function extractArticleHtml(html) {
  const systemStartMarker = "<!-- System - START -->";
  const systemIndex = html.lastIndexOf(systemStartMarker);
  const articleStartCandidates = [...html.matchAll(/<div[^>]*class="[^"]*(?:\barticle\b|tt_article_useless_p_margin)[^"]*"[^>]*>/g)];
  const articleStartMatch = articleStartCandidates.filter((candidate) => candidate.index < systemIndex).pop();
  const startIndex = articleStartMatch ? articleStartMatch.index : -1;

  if (startIndex === -1) {
    throw new Error("본문 시작 지점을 찾지 못했습니다.");
  }

  const bodyStart = startIndex + articleStartMatch[0].length;
  const endIndex = html.indexOf(systemStartMarker, bodyStart);

  if (endIndex === -1) {
    throw new Error("본문 종료 지점을 찾지 못했습니다.");
  }

  return html
    .slice(bodyStart, endIndex)
    .replace(/\s*<\/div>\s*$/, "")
    .trim();
}

function replaceOpenGraphCards(html) {
  return html.replace(
    /<figure\b[^>]*data-ke-type="opengraph"[^>]*data-og-title="([^"]*)"[^>]*data-og-url="([^"]*)"[^>]*>[\s\S]*?<\/figure>/g,
    (_match, title, url) => {
      const safeTitle = decodeHtml(title || url);
      const safeUrl = decodeHtml(url);
      return `<p><a href="${safeUrl}">${safeTitle}</a></p>`;
    }
  );
}

function replaceImageBlocks(html) {
  return html.replace(/<figure\b[^>]*class="imageblock[^"]*"[^>]*>([\s\S]*?)<\/figure>/g, (_match, innerHtml) => {
    const source =
      extractMatch(innerHtml, /data-url="([^"]+)"/) ||
      extractMatch(innerHtml, /data-phocus="([^"]+)"/) ||
      extractMatch(innerHtml, /<img[^>]*src="([^"]+)"/);
    const alt =
      decodeHtml(
        extractMatch(innerHtml, /data-alt="([^"]*)"/) || extractMatch(innerHtml, /<img[^>]*alt="([^"]*)"/)
      ) || "이미지";
    const caption = stripTags(extractMatch(innerHtml, /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/));
    const imageUrl = normalizeAssetUrl(source);

    if (!imageUrl) {
      return caption ? `<p>${caption}</p>` : "";
    }

    const captionHtml = caption ? `\n  <figcaption>${caption}</figcaption>` : "";
    return `<figure>\n  <img src="${imageUrl}" alt="${alt}">${captionHtml}\n</figure>`;
  });
}

function replaceInlineImages(html) {
  return html.replace(/<img\b([^>]*)>/g, (_match, attributes) => {
    const source = extractMatch(attributes, /\ssrc="([^"]+)"/);
    const alt = decodeHtml(extractMatch(attributes, /\salt="([^"]*)"/)) || "이미지";
    const imageUrl = normalizeAssetUrl(source);

    if (!imageUrl) {
      return "";
    }

    return `<img src="${imageUrl}" alt="${alt}">`;
  });
}

function cleanArticleHtml(html) {
  let nextHtml = html;

  nextHtml = replaceOpenGraphCards(nextHtml);
  nextHtml = replaceImageBlocks(nextHtml);
  nextHtml = replaceInlineImages(nextHtml);

  nextHtml = nextHtml
    .replace(/<(\/?)span\b[^>]*>/g, "<$1span>")
    .replace(/\s(?:data-[\w:-]+|style|class|id|width|height|loading|onerror|srcset|contenteditable|rel|target)="[^"]*"/g, "")
    .replace(/\s(?:data-[\w:-]+|style|class|id|width|height|loading|onerror|srcset|contenteditable|rel|target)='[^']*'/g, "")
    .replace(/<span>\s*(<img[^>]+>)\s*<\/span>/g, "$1")
    .replace(/<p>\s*(<figure>[\s\S]*?<\/figure>)\s*<\/p>/g, "$1")
    .replace(/<blockquote>\s*<p>\s*<p>/g, "<blockquote><p>")
    .replace(/<\/p>\s*<\/p>\s*<\/blockquote>/g, "</p></blockquote>")
    .replace(/<p>\s*(?:&nbsp;|\s|<br\s*\/?>)*<\/p>/g, "")
    .replace(/<div>\s*(<(?:p|ul|ol|table|figure|blockquote|pre|h[1-6])[\s\S]*?<\/(?:p|ul|ol|table|figure|blockquote|pre|h[1-6])>)\s*<\/div>/g, "$1")
    .replace(/<\/?(?:span)>\s*/g, "")
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return nextHtml;
}

function buildFrontMatter(post) {
  const lines = [
    "---",
    `title: ${yamlQuote(post.title)}`,
    `description: ${yamlQuote(post.description)}`,
    `date: ${post.publishedAt}`,
  ];

  if (post.updatedAt) {
    lines.push(`updated_at: ${post.updatedAt}`);
  }

  if (post.thumbnail) {
    lines.push(`thumbnail: ${yamlQuote(post.thumbnail)}`);
  }

  if (post.categories.length > 0) {
    lines.push("categories:");
    post.categories.forEach((category) => {
      lines.push(`  - ${yamlQuote(category)}`);
    });
  }

  lines.push(`source_url: ${yamlQuote(post.url)}`);
  lines.push("---", "");

  return lines.join("\n");
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; Codex migration bot)",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} 요청 실패: ${response.status}`);
  }

  return response.text();
}

async function collectCandidateIds() {
  const items = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_CATEGORY_PAGES; page += 1) {
    const html = await fetchText(`${BLOG_BASE_URL}/category?page=${page}`);
    const matches = [...html.matchAll(/"@id":"https:\/\/forrest7\.tistory\.com\/(\d+)","name":"(.*?)"/g)];

    if (matches.length === 0) {
      break;
    }

    matches.forEach((match) => {
      const id = match[1];

      if (seen.has(id)) {
        return;
      }

      seen.add(id);
      items.push(id);
    });
  }

  return items;
}

function buildPostPayload(id, html) {
  const publishedAt = extractMatch(html, /<meta property="article:published_time" content="([^"]+)"/);
  const publishedDate = new Date(publishedAt);

  if (!publishedAt || Number.isNaN(publishedDate.getTime())) {
    throw new Error(`${id}번 글의 게시일을 읽지 못했습니다.`);
  }

  if (publishedDate < CUTOFF_DATE) {
    return null;
  }

  const updatedAt = extractMatch(html, /<meta property="article:modified_time" content="([^"]+)"/);
  const title =
    decodeHtml(extractMatch(html, /<meta property="og:title" content="([^"]+)"/)) ||
    decodeHtml(extractMatch(html, /<title>(.*?) ::/));
  const categoryPath =
    decodeHtml(extractMatch(html, /window\.T\.entryInfo = \{[^}]*categoryLabel":"([^"]+)"/)) ||
    decodeHtml(extractMatch(html, /"categoryName":"([^"]+)"/));
  const categories = categoryPath
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean);
  const thumbnail = normalizeAssetUrl(extractMatch(html, /<meta property="og:image" content="([^"]+)"/));
  const articleHtml = cleanArticleHtml(extractArticleHtml(html));
  const description = stripTags(articleHtml).slice(0, 140).trim();
  const datePrefix = publishedAt.slice(0, 10);
  const slug = slugifyTitle(title, id);
  const fileName = `${datePrefix}-${slug}.md`;

  return {
    id,
    title,
    description,
    publishedAt: publishedAt.replace("T", " ").replace(/([+-]\d\d:\d\d)$/, " $1"),
    updatedAt: updatedAt ? updatedAt.replace("T", " ").replace(/([+-]\d\d:\d\d)$/, " $1") : "",
    thumbnail,
    categories,
    url: `${BLOG_BASE_URL}/${id}`,
    fileName,
    content: articleHtml,
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const candidateIds = await collectCandidateIds();
  const imported = [];

  for (const id of candidateIds) {
    const html = await fetchText(`${BLOG_BASE_URL}/${id}`);
    let payload;

    try {
      payload = buildPostPayload(id, html);
    } catch (error) {
      error.message = `${id}번 글 처리 실패: ${error.message}`;
      throw error;
    }

    if (!payload) {
      continue;
    }

    const filePath = path.join(OUTPUT_DIR, payload.fileName);
    const fileContent = `${buildFrontMatter(payload)}${payload.content}\n`;
    await writeFile(filePath, fileContent, "utf8");
    imported.push(payload);
    console.log(`imported ${payload.fileName}`);
  }

  console.log(`done ${imported.length} posts`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
