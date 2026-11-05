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
const linkGraph = new Map();
const seoState = JSON.parse(fs.readFileSync(path.join(scriptDir, "seo-state.json"), "utf8"));

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
  check((html.match(/<link\b[^>]*rel="canonical"/g) || []).length === 1, `${page.file}: expected exactly one canonical`);
  check((html.match(/<h1\b/g) || []).length === 1, `${page.file}: expected exactly one H1`);
  const h1 = decodeHtml(
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, " ").trim() || ""
  );

  check(title.includes(page.title), `${page.file}: title does not describe the page`);
  check(h1.includes(page.title), `${page.file}: H1 does not describe the page`);
  check(description.length >= 45, `${page.file}: meta description is too short`);
  check(description.length <= 220, `${page.file}: meta description is too long`);
  check(canonical === expectedCanonical, `${page.file}: canonical is incorrect`);
  check(
    html.includes('name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"') &&
      !/\bnoindex\b/i.test(html),
    `${page.file}: indexable robots directive is missing`
  );
  check(html.includes('data-prerendered="true"'), `${page.file}: static enhancement flag is missing`);
  check(!/<script[^>]*src="site-data\.js/.test(html), `${page.file}: static page must not download the full catalog`);
  check(html.includes('name="twitter:image:alt"'), `${page.file}: social image alt text is missing`);
  check(html.includes(`type="application/ld+json" href="${baseUrl}artist.json"`) && html.includes(`type="text/plain" href="${baseUrl}llms.txt"`), `${page.file}: machine-readable references are missing`);
  check(
    !html.includes('id="song-description"></p>') &&
      !html.includes('id="release-grid" aria-live="polite">\n          <!-- mrc:release-grid:start -->\n          <!--'),
    `${page.file}: critical static content is empty`
  );
  check(
    /href="\/?styles\.css\?v=[a-f0-9]{12}"/.test(html),
    `${page.file}: versioned stylesheet URL is missing`
  );

  if (page.path) {
    check(!/<base\b/.test(html), `${page.file}: crawlability must not depend on a base element`);
    for (const [, attribute, value] of html.matchAll(/\b(href|src|srcset|imagesrcset)="([^"]+)"/g)) {
      const urls = attribute.endsWith("srcset") ? value.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]) : [value];
      urls.forEach((url) => check(/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(url), `${page.file}: URL depends on document base (${url})`));
    }
  }

  const releaseArtCount = (html.match(/class="release-art"/g) || []).length;
  const releaseArtFrameCount = (html.match(/class="release-art-frame"/g) || []).length;
  check(
    releaseArtCount === releaseArtFrameCount,
    `${page.file}: every release image must have a square frame`
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
      const graph = JSON.parse(match[1])["@graph"] || [];
      const webPage = graph.find((entity) => entity["@id"] === expectedCanonical + "#webpage");
      check(webPage?.url === expectedCanonical, `${page.file}: WebPage identity is missing or incorrect`);
      check(graph.some((entity) => entity["@id"] === webPage?.mainEntity?.["@id"]), `${page.file}: mainEntity reference has no definition`);
      const artist = graph.find((entity) => entity["@type"] === "MusicGroup");
      check(artist?.logo && artist?.sameAs?.length >= 3, `${page.file}: artist identity and logo are incomplete`);
      check(!artist?.sameAs?.some((url) => /[/#]search(?:[/?]|$)/.test(url)), `${page.file}: search URLs cannot identify the artist`);
      if (page.path) {
        const breadcrumb = graph.find((entity) => entity["@type"] === "BreadcrumbList");
        check(html.includes('aria-label="面包屑导航"'), `${page.file}: visible breadcrumbs are missing`);
        check(breadcrumb?.itemListElement?.at(-1)?.item === expectedCanonical, `${page.file}: breadcrumb must end at this canonical page`);
      }
      if (page.path.startsWith("album/")) {
        const album = graph.find((entity) => entity["@type"] === "MusicAlbum");
        const track = site.tracks.find((item) => page.path === `album/${item.slug}/`);
        const releaseType = { Single: "SingleRelease", EP: "EPRelease" }[track.releaseType] || "AlbumRelease";
        check(album?.albumReleaseType === `https://schema.org/${releaseType}`, `${page.file}: incorrect album release type`);
        check(album?.numTracks === album?.track?.itemListElement?.length, `${page.file}: structured track count does not match the track list`);
      }
      if (page.path.startsWith("single/")) {
        const track = site.tracks.find((item) => page.path.startsWith(`single/${item.slug}/`));
        const songIndex = trackNamesFor(track).findIndex((_, index) => page.path === `single/${track.slug}/${songSlug(track, index)}/`);
        const version = track.trackVersions?.[songIndex];
        const recording = graph.find((entity) => entity["@type"] === "MusicRecording");
        if (version) {
          check(title.includes(version) && h1.includes(version), `${page.file}: recording version must be visible in the title and H1`);
          check(recording?.version === version && recording?.inLanguage === track.trackLanguages[songIndex], `${page.file}: recording version/language is missing`);
          check(html.includes(track.trackDescriptions[songIndex]), `${page.file}: version-specific content is missing`);
        }
      }
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
  const outgoingLinks = new Set();
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
    outgoingLinks.add(resolved.toString());
    check(
      canonicalUrls.has(resolved.toString()),
      `${page.file}: internal link points outside canonical pages (${href})`
    );
  }
  linkGraph.set(expectedCanonical, outgoingLinks);
}

const reachable = new Set([baseUrl]);
for (const url of reachable) {
  for (const target of linkGraph.get(url) || []) reachable.add(target);
}
canonicalUrls.forEach((url) => check(reachable.has(url), `Internal links: orphan page ${url}`));

const artistData = JSON.parse(fs.readFileSync(path.join(rootDir, "artist.json"), "utf8"));
const artistGraph = artistData["@graph"] || [];
check(artistGraph.filter((entity) => entity["@type"] === "MusicAlbum").length === site.tracks.length, "artist.json: release catalog is incomplete");
check(artistGraph.filter((entity) => entity["@type"] === "MusicRecording").length === site.tracks.reduce((sum, track) => sum + trackNamesFor(track).length, 0), "artist.json: recording catalog is incomplete");
const entityIds = new Set(artistGraph.map((entity) => entity["@id"]));
check(entityIds.size === artistGraph.length, "artist.json: duplicate entity IDs");
canonicalUrls.forEach((url) => check(entityIds.has(url + "#webpage"), `artist.json: missing canonical page ${url}`));
const guide = fs.readFileSync(path.join(rootDir, "llms.txt"), "utf8");
const fullReference = fs.readFileSync(path.join(rootDir, "llms-full.txt"), "utf8");
site.tracks.forEach((track) => {
  const url = new URL(`album/${track.slug}/`, baseUrl).toString();
  const album = artistGraph.find((entity) => entity["@type"] === "MusicAlbum" && entity.url === url);
  check(album?.datePublished === track.released, `artist.json: incorrect release date for ${track.slug}`);
  check(guide.includes(url) && fullReference.includes(url) && fullReference.includes(track.released), `Text references: missing release ${track.slug}`);
});

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
check(!sitemap.includes("<image:title>"), "sitemap.xml: deprecated image:title should be omitted");
for (const match of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
  const loc = match[1].match(/<loc>([^<]+)<\/loc>/)?.[1];
  const lastmod = match[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  const state = seoState[new URL(loc).pathname];
  check(/^\d{4}-\d{2}-\d{2}$/.test(lastmod || "") && lastmod <= new Date().toISOString().slice(0, 10), `sitemap.xml: invalid modification date for ${loc}`);
  check(lastmod === state?.lastmod, `sitemap.xml: modification date differs from content state for ${loc}`);
}

check(fs.statSync(path.join(rootDir, "assets/optimized/brand-80.webp")).size < 10000, "Navigation logo should stay below 10 kB");
const headers = fs.readFileSync(path.join(rootDir, "_headers"), "utf8");
check(/https:\/\/mediumrarecode\.pages\.dev\/\*\s+X-Robots-Tag: noindex/.test(headers), "_headers: production hosting alias must not be indexed");
check(/https:\/\/:version\.mediumrarecode\.pages\.dev\/\*\s+X-Robots-Tag: noindex/.test(headers), "_headers: preview hosting aliases must not be indexed");

const redirects = fs.readFileSync(path.join(rootDir, "_redirects"), "utf8");
check(redirects.includes("/sitemap_index.xml /sitemap.xml 301"), "_redirects: sitemap discovery alias is missing");
["/album/:release", "/single/:release/:song"].forEach((prefix) => {
  check(redirects.includes(`${prefix}/assets/* /assets/:splat 301`), "_redirects: nested asset recovery is missing");
  ["app.js", "site-data.js", "styles.css"].forEach((file) => check(redirects.includes(`${prefix}/${file} /${file} 301`), `_redirects: nested ${file} recovery is missing`));
});
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
const styles = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");
check(
  /\.release-art-frame\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1;/.test(styles),
  "styles.css: release image frame must remain square"
);
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
  `Validated ${canonicalPages.length} canonical pages, ${sitemapUrls.size} sitemap URLs, content dates, redirects, semantic structured data, images, and crawlable internal links.`
);
