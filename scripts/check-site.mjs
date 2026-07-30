import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(rootDir, "site-data.js"), "utf8"), context);

const site = context.window.MRC_SITE;
const baseUrl = site.baseUrl;
const errors = [];

function check(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function decodeHtml(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function slugify(value) {
  return (
    String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "track"
  );
}

function trackNamesFor(track) {
  return track.trackNames?.length ? track.trackNames : [track.title];
}

function songSlug(track, index) {
  const explicit = track.songSlugs?.[index];
  const base = slugify(explicit || trackNamesFor(track)[index] || track.title);
  const firstIndex = trackNamesFor(track).findIndex((name, itemIndex) => {
    const itemBase = slugify(track.songSlugs?.[itemIndex] || name || track.title);
    return itemBase === base;
  });
  return firstIndex === index ? base : `${base}-${index + 1}`;
}

const canonicalPages = [
  {
    file: "index.html",
    path: "",
    title: "medium rare code"
  }
];

site.tracks.forEach((track) => {
  canonicalPages.push({
    file: `album/${track.slug}/index.html`,
    path: `album/${track.slug}/`,
    title: track.title
  });
  if (track.trackCount > 1) {
    trackNamesFor(track).forEach((name, index) => {
      canonicalPages.push({
        file: `single/${track.slug}/${songSlug(track, index)}/index.html`,
        path: `single/${track.slug}/${songSlug(track, index)}/`,
        title: name
      });
    });
  }
});

const canonicalUrls = new Set(canonicalPages.map((page) => new URL(page.path, baseUrl).toString()));
const titles = new Map();
const descriptions = new Map();

for (const page of canonicalPages) {
  const filePath = path.join(rootDir, page.file);
  check(fs.existsSync(filePath), `${page.file}: file is missing`);
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const html = fs.readFileSync(filePath, "utf8");
  const expectedCanonical = new URL(page.path, baseUrl).toString();
  const title = decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || "");
  const descriptionTag = html.match(/<meta\s+name="description"[\s\S]*?>/)?.[0] || "";
  const description = decodeHtml(
    descriptionTag.match(/content="([^"]*)"/)?.[1]?.trim() || ""
  );
  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1] || "";
  const h1 = decodeHtml(
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, " ").trim() || ""
  );

  check(title.includes(page.title), `${page.file}: title does not describe the page`);
  check(h1.includes(page.title), `${page.file}: H1 does not describe the page`);
  check(description.length >= 45, `${page.file}: meta description is too short`);
  check(description.length <= 220, `${page.file}: meta description is too long`);
  check(canonical === expectedCanonical, `${page.file}: canonical is incorrect`);
  check(
    html.includes('name="robots" content="index,follow,max-image-preview:large"') ||
      page.file === "index.html",
    `${page.file}: indexable robots directive is missing`
  );
  check(
    !html.includes('id="song-description"></p>') &&
      !html.includes('id="release-grid" aria-live="polite">\n          <!-- mrc:release-grid:start -->\n          <!--'),
    `${page.file}: critical static content is empty`
  );

  if (titles.has(title)) {
    errors.push(`${page.file}: duplicate title also used by ${titles.get(title)}`);
  } else {
    titles.set(title, page.file);
  }
  if (descriptions.has(description)) {
    errors.push(`${page.file}: duplicate description also used by ${descriptions.get(description)}`);
  } else {
    descriptions.set(description, page.file);
  }

  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  check(jsonLdMatches.length > 0, `${page.file}: JSON-LD is missing`);
  jsonLdMatches.forEach((match, index) => {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${page.file}: JSON-LD ${index + 1} is invalid (${error.message})`);
    }
  });

  for (const match of html.matchAll(/<(?:img|source)\b[^>]*(?:src|srcset)="([^"]+)"/g)) {
    const candidates = match[1].split(",").map((item) => item.trim().split(/\s+/)[0]);
    candidates.forEach((candidate) => {
      if (!candidate || /^https?:/.test(candidate) || candidate.startsWith("data:")) {
        return;
      }
      const clean = candidate.replace(/^\//, "");
      check(fs.existsSync(path.join(rootDir, clean)), `${page.file}: missing image ${candidate}`);
    });
  }

  const documentBase = html.match(/<base href="([^"]+)">/)?.[1];
  const resolutionBase = documentBase
    ? new URL(documentBase, expectedCanonical).toString()
    : expectedCanonical;
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const href = match[1];
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      continue;
    }
    const resolved = new URL(href, resolutionBase);
    if (resolved.origin !== new URL(baseUrl).origin) {
      continue;
    }
    resolved.hash = "";
    check(
      canonicalUrls.has(resolved.toString()),
      `${page.file}: internal link points outside canonical pages (${href})`
    );
  }
}

const robots = fs.readFileSync(path.join(rootDir, "robots.txt"), "utf8");
check(robots.includes("User-agent: *"), "robots.txt: user agent rule is missing");
check(
  robots.includes(`Sitemap: ${new URL("sitemap.xml", baseUrl)}`),
  "robots.txt: sitemap declaration is missing"
);

const sitemap = fs.readFileSync(path.join(rootDir, "sitemap.xml"), "utf8");
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
check(
  sitemapUrls.size === canonicalUrls.size,
  `sitemap.xml: expected ${canonicalUrls.size} URLs, found ${sitemapUrls.size}`
);
canonicalUrls.forEach((url) => check(sitemapUrls.has(url), `sitemap.xml: missing ${url}`));

const redirects = fs.readFileSync(path.join(rootDir, "_redirects"), "utf8");
site.tracks
  .filter((track) => track.trackCount === 1)
  .forEach((track) => {
    const legacy = `/single/${track.slug}/${songSlug(track, 0)}/`;
    check(
      redirects.includes(`${legacy} /album/${track.slug}/ 301`),
      `_redirects: missing consolidation redirect for ${legacy}`
    );
    check(
      !fs.existsSync(path.join(rootDir, legacy, "index.html")),
      `${legacy}: duplicate single page should not exist`
    );
  });

const notFound = fs.readFileSync(path.join(rootDir, "404.html"), "utf8");
check(notFound.includes('name="robots" content="noindex,follow"'), "404.html: noindex is missing");
["song.html", "single.html"].forEach((file) => {
  const html = fs.readFileSync(path.join(rootDir, file), "utf8");
  check(
    html.includes('name="robots" content="noindex,follow"'),
    `${file}: legacy page must be noindex`
  );
});

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(
  `Validated ${canonicalPages.length} canonical pages, ${sitemapUrls.size} sitemap URLs, redirects, structured data, images, and internal links.`
);
