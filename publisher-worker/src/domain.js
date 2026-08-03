export const LIMITS = Object.freeze({
  maxImages: 5,
  maxImageBytes: 3 * 1024 * 1024,
  maxTotalImageBytes: 10 * 1024 * 1024,
  maxMarkdownBytes: 500 * 1024,
});

const MIME_TYPES = Object.freeze({
  "image/jpeg": { extension: "jpg", signature: "jpeg" },
  "image/png": { extension: "png", signature: "png" },
  "image/gif": { extension: "gif", signature: "gif" },
  "image/webp": { extension: "webp", signature: "webp" },
});

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
];

const textEncoder = new TextEncoder();

export class PublisherError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "PublisherError";
    this.code = code;
    this.status = status;
  }
}

export function normalizeSlug(value) {
  const normalized = String(value || "")
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return Array.from(normalized || "new-post").slice(0, 80).join("");
}

function seoulParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }
  return values;
}

export function getSeoulDate(now = new Date()) {
  const parts = seoulParts(now);
  return parts.year + "-" + parts.month + "-" + parts.day;
}

function getSeoulTimestamp(now) {
  const parts = seoulParts(now);
  return [parts.year, parts.month, parts.day].join("-") + " " + [parts.hour, parts.minute, parts.second].join(":") + " +0900";
}

function yamlString(value) {
  return JSON.stringify(String(value || ""));
}

function validateText(value, field, maximum, required = false) {
  if (typeof value !== "string") {
    throw new PublisherError("INVALID_INPUT", field + " 값이 올바르지 않습니다.");
  }

  const normalized = value.normalize("NFC").trim();
  if (required && !normalized) {
    throw new PublisherError("INVALID_INPUT", field + "을(를) 입력해 주세요.");
  }
  if (Array.from(normalized).length > maximum) {
    throw new PublisherError("INVALID_INPUT", field + "이(가) 너무 깁니다.");
  }
  return normalized;
}

function validateStringArray(value, field) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > 10) {
    throw new PublisherError("INVALID_INPUT", field + " 값이 올바르지 않습니다.");
  }

  const result = value.map((item) => validateText(item, field, 80, true));
  return Array.from(new Set(result));
}

function validateThumbnail(value) {
  const thumbnail = validateText(value || "", "썸네일", 500);
  if (!thumbnail) {
    return "";
  }

  if (thumbnail.startsWith("/") && !thumbnail.startsWith("//") && !thumbnail.split("/").includes("..")) {
    return thumbnail;
  }

  try {
    const url = new URL(thumbnail);
    if (url.protocol === "https:") {
      return url.toString();
    }
  } catch (error) {
    // 아래의 안전한 사용자 오류로 통일합니다.
  }

  throw new PublisherError("INVALID_INPUT", "썸네일은 /assets 경로 또는 HTTPS 주소만 사용할 수 있습니다.");
}

function decodeBase64(value) {
  const normalized = String(value || "").replace(/\s/g, "");
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    throw new PublisherError("IMAGE_INVALID", "이미지 데이터가 올바르지 않습니다.");
  }

  let binary;
  try {
    binary = atob(normalized);
  } catch (error) {
    throw new PublisherError("IMAGE_INVALID", "이미지 데이터가 올바르지 않습니다.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { bytes, normalized };
}

function startsWith(bytes, expected) {
  return expected.every((value, index) => bytes[index] === value);
}

function matchesSignature(bytes, signature) {
  if (signature === "jpeg") {
    return startsWith(bytes, [0xff, 0xd8, 0xff]);
  }
  if (signature === "png") {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (signature === "gif") {
    return startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  }
  if (signature === "webp") {
    return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

function assertNoSecrets(value) {
  if (SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new PublisherError("SECRET_DETECTED", "공개하면 안 되는 비밀값이 발견됐습니다.");
  }
}

function buildMarkdown({ title, description, timestamp, thumbnail, categories, tags, body }) {
  const lines = [
    "---",
    "title: " + yamlString(title),
    "description: " + yamlString(description),
    "date: " + timestamp,
    "updated_at: " + timestamp,
  ];

  if (thumbnail) {
    lines.push("thumbnail: " + yamlString(thumbnail));
  }
  if (categories.length) {
    lines.push("categories:");
    for (const category of categories) {
      lines.push("  - " + yamlString(category));
    }
  }
  if (tags.length) {
    lines.push("tags:");
    for (const tag of tags) {
      lines.push("  - " + yamlString(tag));
    }
  }
  lines.push("---", "", body, "");
  return lines.join("\n");
}

export function preparePublication(payload, now = new Date()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new PublisherError("INVALID_INPUT", "게시 요청이 올바르지 않습니다.");
  }

  const title = validateText(payload.title, "제목", 200, true);
  const description = validateText(payload.description || "", "설명", 500);
  const categories = validateStringArray(payload.categories, "카테고리");
  const tags = validateStringArray(payload.tags, "태그");
  const thumbnail = validateThumbnail(payload.thumbnail || "");
  const slug = normalizeSlug(payload.slug || title);
  const date = getSeoulDate(now);
  const timestamp = getSeoulTimestamp(now);
  let body = validateText(payload.body, "본문", 500000, true);
  const rawImages = payload.images === undefined ? [] : payload.images;

  if (!Array.isArray(rawImages) || rawImages.length > LIMITS.maxImages) {
    throw new PublisherError("IMAGE_INVALID", "한 글에는 이미지를 최대 5개까지 게시할 수 있습니다.");
  }

  const seenIds = new Set();
  const imageItems = [];
  let totalImageBytes = 0;

  rawImages.forEach((image, index) => {
    if (!image || typeof image !== "object" || !/^image-[1-5]$/.test(String(image.id || "")) || seenIds.has(image.id)) {
      throw new PublisherError("IMAGE_INVALID", "이미지 식별자가 올바르지 않습니다.");
    }
    seenIds.add(image.id);

    const mimeType = String(image.mimeType || "").toLowerCase();
    const mime = MIME_TYPES[mimeType];
    if (!mime) {
      throw new PublisherError("IMAGE_INVALID", "JPEG, PNG, GIF, WebP 이미지만 게시할 수 있습니다.");
    }

    const decoded = decodeBase64(image.dataBase64);
    if (decoded.bytes.length > LIMITS.maxImageBytes || !matchesSignature(decoded.bytes, mime.signature)) {
      throw new PublisherError("IMAGE_INVALID", "이미지 형식 또는 용량이 올바르지 않습니다.");
    }
    totalImageBytes += decoded.bytes.length;
    if (totalImageBytes > LIMITS.maxTotalImageBytes) {
      throw new PublisherError("IMAGE_INVALID", "이미지 전체 용량은 10MB 이하여야 합니다.");
    }

    const placeholder = "bloglim-image://" + image.id;
    if (!body.includes(placeholder)) {
      throw new PublisherError("IMAGE_INVALID", "본문에서 이미지 위치를 찾을 수 없습니다.");
    }

    const path = "assets/images/posts/" + date + "-" + slug + "/" + String(index + 1).padStart(2, "0") + "." + mime.extension;
    body = body.split(placeholder).join("/BlogLim/" + path);
    imageItems.push({ path, dataBase64: decoded.normalized });
  });

  if (/bloglim-image:\/\//i.test(body) || /data:image\//i.test(body)) {
    throw new PublisherError("IMAGE_INVALID", "처리되지 않은 이미지가 본문에 남아 있습니다.");
  }

  assertNoSecrets([title, description, thumbnail, categories.join("\n"), tags.join("\n"), body].join("\n"));

  const markdown = buildMarkdown({ title, description, timestamp, thumbnail, categories, tags, body });
  if (textEncoder.encode(markdown).length > LIMITS.maxMarkdownBytes) {
    throw new PublisherError("INVALID_INPUT", "마크다운 글은 500KB 이하여야 합니다.");
  }

  return {
    title,
    slug,
    date,
    postPath: "_posts/" + date + "-" + slug + ".md",
    markdown,
    images: imageItems,
  };
}
