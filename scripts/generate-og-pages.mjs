import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const siteDataPath = path.join(rootDir, "site-data.js");
const context = { window: {} };

vm.runInNewContext(fs.readFileSync(siteDataPath, "utf8"), context, {
  filename: siteDataPath
});

const site = context.window.MRC_SITE;
const baseUrl = site.baseUrl || "https://mediumrarecode.com/";
const homeUrl = absoluteUrl("");
const ogDir = path.join(rootDir, "assets", "og");
const optimizedDir = path.join(rootDir, "assets", "optimized");
const optimizedCoverDir = path.join(rootDir, "assets", "covers", "optimized");
const brandLogoPath = path.join(rootDir, "assets", "medium-rare-code-logo-2026.png");
const faviconPath = path.join(rootDir, "assets", "favicon-48-2026.png");
const appleTouchIconPath = path.join(rootDir, "assets", "apple-touch-icon-2026.png");
const artistId = homeUrl + "#artist";
const assetVersion = createHash("sha256")
  .update(fs.readFileSync(path.join(rootDir, "styles.css")))
  .update(fs.readFileSync(path.join(rootDir, "app.js")))
  .update(fs.readFileSync(siteDataPath))
  .digest("hex")
  .slice(0, 12);

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanDescription(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncate(value, maxLength = 158) {
  const text = cleanDescription(value);
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1).trimEnd() + "…";
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function releaseTypeLabel(type) {
  const labels = {
    Single: "单曲",
    EP: "EP",
    Album: "专辑"
  };
  return labels[type] || type;
}

function formatDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) {
    return String(value || "");
  }
  return `${year}年${month}月${day}日`;
}

function pairedTitle(english, chinese) {
  return chinese ? english + "（" + chinese + "）" : english;
}

function releaseTitle(track) {
  return pairedTitle(track.title, track.titleZh);
}

function trackNamesFor(track) {
  return track.trackNames && track.trackNames.length ? track.trackNames : [track.title];
}

function slugify(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "track";
}

function baseSongSlug(track, index) {
  const explicit = track.songSlugs && track.songSlugs[index];
  return slugify(explicit || trackNamesFor(track)[index] || track.title);
}

function songSlug(track, index) {
  const base = baseSongSlug(track, index);
  const firstIndex = trackNamesFor(track).findIndex((name, itemIndex) => {
    return name && baseSongSlug(track, itemIndex) === base;
  });
  return firstIndex === index ? base : base + "-" + String(index + 1);
}

function songTitle(track, index) {
  const title = pairedTitle(trackNamesFor(track)[index], track.trackNamesZh && track.trackNamesZh[index]);
  return track.trackVersions?.[index] ? title + " · " + track.trackVersions[index] : title;
}

function releaseDescription(track) {
  const facts = `${releaseTitle(track)} 是 ${site.artistName} 于 ${formatDate(
    track.released
  )}发行的${releaseTypeLabel(track.releaseType)}，曲风为 ${track.genre}。`;
  return truncate(track.description ? facts + " " + cleanDescription(track.description) : facts);
}

function songDescription(track, index) {
  const title = songTitle(track, index);
  if (track.trackDescriptions?.[index]) {
    return truncate(`${title}，${site.artistName} 于 ${formatDate(track.released)}发行。${track.trackDescriptions[index]}`);
  }
  if (track.trackCount === 1 && track.description) {
    return truncate(
      `${title} 是 ${site.artistName} 于 ${formatDate(track.released)}发行的作品。${cleanDescription(
        track.description
      )}`
    );
  }
  return truncate(
    `${title} 是 ${site.artistName} 收录于《${releaseTitle(track)}》的第 ${
      index + 1
    } 首作品，发行于 ${formatDate(track.released)}，曲风为 ${track.genre}。`
  );
}

function releasePath(track) {
  return "album/" + encodeURIComponent(track.slug) + "/";
}

function singlePath(track, index) {
  if (track.trackCount === 1) {
    return releasePath(track);
  }
  return standaloneSinglePath(track, index);
}

function standaloneSinglePath(track, index) {
  return (
    "single/" +
    encodeURIComponent(track.slug) +
    "/" +
    encodeURIComponent(songSlug(track, index)) +
    "/"
  );
}

function absoluteUrl(pathname) {
  return new URL(pathname, baseUrl).toString();
}

function youtubeIdFor(track, index) {
  return track.youtubeIds && track.youtubeIds[index] ? String(track.youtubeIds[index]).trim() : "";
}

function youtubeEmbedUrl(videoId) {
  return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(videoId);
}

function rootPrefix(depth) {
  return "../".repeat(depth);
}

function imageInfo(relativePath) {
  const fallback = site.banner;
  const target = relativePath || fallback;
  const bytes = fs.readFileSync(path.join(rootDir, target));

  if (bytes[0] === 0x89 && bytes.toString("ascii", 1, 4) === "PNG") {
    return {
      height: bytes.readUInt32BE(20),
      mime: "image/png",
      path: target,
      width: bytes.readUInt32BE(16)
    };
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = bytes[offset + 1];
      offset += 2;

      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }

      const length = bytes.readUInt16BE(offset);
      if (
        marker === 0xc0 ||
        marker === 0xc1 ||
        marker === 0xc2 ||
        marker === 0xc3 ||
        marker === 0xc5 ||
        marker === 0xc6 ||
        marker === 0xc7 ||
        marker === 0xc9 ||
        marker === 0xca ||
        marker === 0xcb ||
        marker === 0xcd ||
        marker === 0xce ||
        marker === 0xcf
      ) {
        return {
          height: bytes.readUInt16BE(offset + 3),
          mime: "image/jpeg",
          path: target,
          width: bytes.readUInt16BE(offset + 5)
        };
      }
      offset += length;
    }
  }

  throw new Error("Unsupported image format: " + target);
}

function parseLengthSeconds(value) {
  const parts = String(value || "")
    .split(":")
    .map((part) => Number(part));
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) {
    return "";
  }
  return String(parts.reduce((total, part) => total * 60 + part, 0));
}

function runSips(args) {
  execFileSync("sips", args, { stdio: "ignore" });
}

function optimizedCoverPath(track, width) {
  return `assets/covers/optimized/${track.slug}-${width}.webp`;
}

async function generateResponsiveImage(source, output, maxDimension, quality) {
  await sharp(source)
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ effort: 5, quality })
    .toFile(output);
}

async function generateOptimizedAssets() {
  fs.rmSync(optimizedDir, { force: true, recursive: true });
  fs.rmSync(optimizedCoverDir, { force: true, recursive: true });
  fs.mkdirSync(optimizedDir, { recursive: true });
  fs.mkdirSync(optimizedCoverDir, { recursive: true });

  await Promise.all(
    site.tracks.flatMap((track) => {
    const source = path.join(rootDir, track.cover || site.banner);
      return [
        generateResponsiveImage(
          source,
          path.join(rootDir, optimizedCoverPath(track, 160)),
          160,
          68
        ),
        generateResponsiveImage(
          source,
          path.join(rootDir, optimizedCoverPath(track, 480)),
          480,
          72
        ),
        generateResponsiveImage(
          source,
          path.join(rootDir, optimizedCoverPath(track, 800)),
          800,
          76
        )
      ];
    })
  );

  const banner = path.join(rootDir, site.banner);
  await Promise.all([
    generateResponsiveImage(
      banner,
      path.join(optimizedDir, "background-2026-960.webp"),
      960,
      72
    ),
    generateResponsiveImage(
      banner,
      path.join(optimizedDir, "background-2026-1600.webp"),
      1600,
      76
    ),
    sharp(brandLogoPath)
      .resize(80, 80)
      .webp({ quality: 80 })
      .toFile(path.join(optimizedDir, "brand-80.webp")),
    sharp(brandLogoPath)
      .resize(48, 48)
      .png({ compressionLevel: 9 })
      .toFile(faviconPath),
    sharp(brandLogoPath)
      .resize(180, 180)
      .png({ compressionLevel: 9 })
      .toFile(appleTouchIconPath)
  ]);
}

function ogImagePath(slug) {
  return "assets/og/" + slug + ".jpg";
}

function generateHomeOgImage(tmpDir) {
  const output = path.join(rootDir, ogImagePath("home"));
  const temp = path.join(tmpDir, "home.jpg");
  runSips(["-Z", "1200", path.join(rootDir, site.banner), "--out", temp]);
  runSips(["-c", "630", "1200", temp, "--out", output]);
}

function generateReleaseOgImage(track, tmpDir) {
  const output = path.join(rootDir, ogImagePath(track.slug));
  const temp = path.join(tmpDir, track.slug + ".jpg");
  runSips(["-Z", "630", path.join(rootDir, track.cover || site.banner), "--out", temp]);
  runSips(["-p", "630", "1200", "--padColor", "070909", temp, "--out", output]);
}

function generateOgImages() {
  fs.rmSync(ogDir, { force: true, recursive: true });
  fs.mkdirSync(ogDir, { recursive: true });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mrc-og-"));
  try {
    generateHomeOgImage(tmpDir);
    site.tracks.forEach((track) => {
      generateReleaseOgImage(track, tmpDir);
    });
  } finally {
    fs.rmSync(tmpDir, { force: true, recursive: true });
  }
}

function meta(property, content) {
  if (!content) {
    return "";
  }
  return `    <meta property="${property}" content="${escapeHtml(content)}">\n`;
}

function nameMeta(name, content) {
  if (!content) {
    return "";
  }
  return `    <meta name="${name}" content="${escapeHtml(content)}">\n`;
}

function jsonLdScript(value, indent = "    ") {
  const json = JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
  return `${indent}<script type="application/ld+json">\n${json
    .split("\n")
    .map((line) => indent + "  " + line)
    .join("\n")}\n${indent}</script>\n`;
}

function head({
  description,
  imageAlt,
  imagePath,
  jsonLd,
  musicMeta = "",
  ogType,
  preloadImage,
  root,
  title,
  titleTag,
  url
}) {
  const image = imageInfo(imagePath);
  const imageUrl = absoluteUrl(image.path);

  return `<!doctype html>
<html lang="zh-Hans" prefix="og: https://ogp.me/ns# music: https://ogp.me/ns/music#">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <base href="${escapeHtml(root)}">
    <meta name="mrc-root" content="${escapeHtml(root)}">
    <title>${escapeHtml(titleTag)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" href="${escapeHtml(url)}">
    <link rel="icon" type="image/png" sizes="48x48" href="assets/favicon-48-2026.png">
    <link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon-2026.png">
${meta("og:title", title)}${meta("og:type", ogType)}${meta("og:url", url)}${meta("og:site_name", site.artistName)}${meta("og:locale", "zh_CN")}${meta("og:description", description)}${meta("og:image", imageUrl)}${meta("og:image:secure_url", imageUrl)}${meta("og:image:type", image.mime)}${meta("og:image:width", String(image.width))}${meta("og:image:height", String(image.height))}${meta("og:image:alt", imageAlt)}${musicMeta}${nameMeta("twitter:card", "summary_large_image")}${nameMeta("twitter:title", title)}${nameMeta("twitter:description", description)}${nameMeta("twitter:image", imageUrl)}${nameMeta("twitter:image:alt", imageAlt)}${preloadImage || ""}${jsonLd ? jsonLdScript(jsonLd) : ""}    <link rel="stylesheet" href="styles.css?v=${assetVersion}">
    <script src="app.js?v=${assetVersion}" defer></script>
  </head>
`;
}

function releaseMusicMeta(track) {
  let output = meta("music:musician", homeUrl);
  output += meta("music:release_date", track.released);
  trackNamesFor(track).forEach((_, index) => {
    output += meta("music:song", absoluteUrl(singlePath(track, index)));
    output += meta("music:song:track", String(index + 1));
  });
  return output;
}

function singleMusicMeta(track, index) {
  let output = meta("music:musician", homeUrl);
  output += meta("music:album", absoluteUrl(releasePath(track)));
  output += meta("music:album:track", String(index + 1));
  if (track.trackCount === 1) {
    output += meta("music:duration", parseLengthSeconds(track.length));
  }
  const youtubeId = youtubeIdFor(track, index);
  if (youtubeId) {
    const videoUrl = youtubeEmbedUrl(youtubeId);
    output += meta("og:video", videoUrl);
    output += meta("og:video:secure_url", videoUrl);
    output += meta("og:video:type", "text/html");
    output += meta("og:video:width", "1280");
    output += meta("og:video:height", "720");
  }
  return output;
}

function artistReference() {
  return {
    "@id": artistId
  };
}

function identityLinks(links) {
  return links.map((item) => item.url).filter((url) => !/[/#]search(?:[/?]|$)/.test(url));
}

function artistEntity() {
  return {
    "@type": "MusicGroup",
    "@id": artistId,
    name: "medium rare code",
    alternateName: ["半熟代码", site.artistName],
    url: homeUrl,
    image: absoluteUrl(ogImagePath("home")),
    logo: absoluteUrl("assets/medium-rare-code-logo-2026.png"),
    genre: [...new Set(site.tracks.map((track) => track.genre).filter(Boolean))],
    sameAs: identityLinks(site.artistLinks)
  };
}

function breadcrumb(items) {
  return {
    "@type": "BreadcrumbList",
    "@id": absoluteUrl(items.at(-1).path) + "#breadcrumb",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

function websiteEntity() {
  return {
    "@type": "WebSite",
    "@id": homeUrl + "#website",
    url: homeUrl,
    name: "medium rare code",
    alternateName: ["半熟代码", site.artistName],
    inLanguage: "zh-Hans",
    publisher: artistReference()
  };
}

function webPageEntity({ url, name, description, entity, type = "WebPage", hasBreadcrumb = true }) {
  return {
    "@type": type,
    "@id": url + "#webpage",
    url,
    name,
    description,
    inLanguage: "zh-Hans",
    isPartOf: { "@id": homeUrl + "#website" },
    about: artistReference(),
    mainEntity: { "@id": entity },
    ...(hasBreadcrumb ? { breadcrumb: { "@id": url + "#breadcrumb" } } : {})
  };
}

function musicRecordingEntity(track, index) {
  const url = absoluteUrl(singlePath(track, index));
  const duration = track.trackCount === 1 ? parseLengthSeconds(track.length) : "";
  return {
    "@type": "MusicRecording",
    "@id": url + "#recording",
    name: trackNamesFor(track)[index],
    ...(track.trackNamesZh && track.trackNamesZh[index]
      ? { alternateName: track.trackNamesZh[index] }
      : {}),
    url,
    description: songDescription(track, index),
    image: absoluteUrl(track.cover || site.banner),
    datePublished: track.released,
    genre: track.genre,
    ...(track.trackLanguages?.[index] ? { inLanguage: track.trackLanguages[index] } : {}),
    ...(track.trackVersions?.[index] ? { version: track.trackVersions[index] } : {}),
    ...(duration ? { duration: "PT" + duration + "S" } : {}),
    byArtist: artistReference(),
    mainEntityOfPage: { "@id": url + "#webpage" },
    inAlbum: {
      "@id": absoluteUrl(releasePath(track)) + "#release"
    }
  };
}

function releaseStructuredData(track) {
  const url = absoluteUrl(releasePath(track));
  return {
    "@context": "https://schema.org",
    "@graph": [
      websiteEntity(),
      artistEntity(),
      webPageEntity({ url, name: releaseTitle(track), description: releaseDescription(track), entity: url + "#release" }),
      {
        "@type": "MusicAlbum",
        "@id": url + "#release",
        name: track.title,
        ...(track.titleZh ? { alternateName: track.titleZh } : {}),
        url,
        description: cleanDescription(track.description || releaseDescription(track)),
        image: absoluteUrl(track.cover || site.banner),
        datePublished: track.released,
        genre: track.genre,
        numTracks: track.trackCount,
        albumReleaseType:
          track.releaseType === "Single"
            ? "https://schema.org/SingleRelease"
            : track.releaseType === "EP"
            ? "https://schema.org/EPRelease"
            : "https://schema.org/AlbumRelease",
        byArtist: artistReference(),
        mainEntityOfPage: { "@id": url + "#webpage" },
        track: {
          "@type": "ItemList",
          numberOfItems: track.trackCount,
          itemListElement: trackNamesFor(track).map((_, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: musicRecordingEntity(track, index)
          }))
        }
      },
      breadcrumb([
        { name: "首页", path: "" },
        { name: releaseTitle(track), path: releasePath(track) }
      ])
    ]
  };
}

function singleStructuredData(track, index) {
  const url = absoluteUrl(singlePath(track, index));
  return {
    "@context": "https://schema.org",
    "@graph": [
      websiteEntity(),
      artistEntity(),
      webPageEntity({ url, name: songTitle(track, index), description: songDescription(track, index), entity: url + "#recording" }),
      {
        "@type": "MusicAlbum",
        "@id": absoluteUrl(releasePath(track)) + "#release",
        name: releaseTitle(track),
        url: absoluteUrl(releasePath(track)),
        byArtist: artistReference()
      },
      musicRecordingEntity(track, index),
      breadcrumb([
        { name: "首页", path: "" },
        { name: releaseTitle(track), path: releasePath(track) },
        { name: songTitle(track, index), path: singlePath(track, index) }
      ])
    ]
  };
}

function homeStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      websiteEntity(),
      artistEntity(),
      webPageEntity({ url: homeUrl, name: site.artistName, description: "medium rare code（半熟代码）独立音乐人官方网站：原创单曲、专辑介绍及全平台收听链接。", entity: homeUrl + "#releases", type: "CollectionPage", hasBreadcrumb: false }),
      {
        "@type": "ItemList",
        "@id": homeUrl + "#releases",
        name: "原创单曲与专辑",
        numberOfItems: site.tracks.length,
        itemListElement: site.tracks.map((track, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: releaseTitle(track),
          url: absoluteUrl(releasePath(track))
        }))
      }
    ]
  };
}

function platformSlug(label) {
  const slugs = {
    "Apple Music": "apple-music",
    "YouTube Music": "youtube-music",
    Spotify: "spotify",
    "QQ 音乐": "qq-music",
    网易云: "netease-cloud-music"
  };
  return slugs[label] || String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function platformIcon(label) {
  const icons = {
    "Apple Music": "assets/logos/apple-music.svg",
    "YouTube Music": "assets/logos/youtube-music.svg",
    Spotify: "assets/logos/spotify.svg",
    "QQ 音乐": "assets/logos/qq-music.svg",
    网易云: "assets/logos/netease-cloud-music.svg"
  };
  return icons[label] || "";
}

function searchUrl(base, title) {
  return base + encodeURIComponent((site.platformSearchName || site.artistName) + " " + title);
}

function songPlatformLinks(track, index) {
  if (track.trackCount === 1 || (track.links && track.links.length === 1)) {
    return track.links;
  }
  const title = trackNamesFor(track)[index];
  const neteaseTitle = (track.trackNamesZh && track.trackNamesZh[index]) || title;
  return [
    {
      label: "Apple Music",
      url: searchUrl("https://music.apple.com/us/search?term=", title),
      primary: true
    },
    {
      label: "YouTube Music",
      url: searchUrl("https://music.youtube.com/search?q=", title)
    },
    {
      label: "Spotify",
      url: searchUrl("https://open.spotify.com/search/", title)
    },
    {
      label: "QQ 音乐",
      url:
        (track.qqSongUrls && track.qqSongUrls[index]) ||
        searchUrl("https://y.qq.com/n/ryqq/search?w=", title) + "&t=song"
    },
    {
      label: "网易云",
      url: searchUrl("https://music.163.com/#/search/m/?s=", neteaseTitle)
    }
  ];
}

function analyticsAttributes(context, label) {
  const values = {
    "data-analytics-event": "platform_clickthrough",
    "data-platform": platformSlug(label),
    "data-link-scope": context.scope,
    "data-release-slug": context.releaseSlug,
    "data-release-title": context.releaseTitle,
    "data-song-slug": context.songSlug,
    "data-song-title": context.songTitle
  };
  return Object.entries(values)
    .filter(([, value]) => value)
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join("");
}

function platformLinksHtml(links, context) {
  return links
    .map((item) => {
      const slug = platformSlug(item.label);
      const icon = platformIcon(item.label);
      const iconHtml = icon
        ? `<span class="platform-logo platform-logo-${slug}"><img src="${escapeHtml(
            icon
          )}" alt="" width="22" height="22" loading="lazy" decoding="async"></span>`
        : "";
      return `<a class="platform-link" href="${escapeHtml(
        item.url
      )}" target="_blank" rel="noopener noreferrer"${analyticsAttributes(
        context,
        item.label
      )}><span class="platform-name">${iconHtml}<span class="platform-label">${escapeHtml(
        item.label
      )}</span></span></a>`;
    })
    .join("\n");
}

function coverImageHtml(track, className, options = {}) {
  const sizes = options.sizes || "100vw";
  const loading = options.loading || "lazy";
  const priority = options.fetchPriority
    ? ` fetchpriority="${escapeHtml(options.fetchPriority)}"`
    : "";
  return `<img class="${escapeHtml(className)}" src="${escapeHtml(
    track.cover || site.banner
  )}" srcset="${escapeHtml(optimizedCoverPath(track, 160))} 160w, ${escapeHtml(
    optimizedCoverPath(track, 480)
  )} 480w, ${escapeHtml(
    optimizedCoverPath(track, 800)
  )} 800w" sizes="${escapeHtml(sizes)}" width="800" height="800" alt="${escapeHtml(
    options.alt === undefined ? releaseTitle(track) + " 封面" : options.alt
  )}" loading="${escapeHtml(loading)}" decoding="async"${priority}>`;
}

function trackMeta(track) {
  return [
    releaseTypeLabel(track.releaseType),
    formatDate(track.released),
    track.genre,
    track.length
  ]
    .filter(Boolean)
    .join(" / ");
}

function songMeta(track) {
  return [
    "单曲",
    formatDate(track.released),
    track.genre,
    track.trackCount === 1 ? track.length : ""
  ]
    .filter(Boolean)
    .join(" / ");
}

function tagsHtml(tags) {
  return `<div class="tag-list">${tags
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join("")}</div>`;
}

function releaseCardHtml(track, options = {}) {
  const compact = Boolean(options.compact);
  const details = compact
    ? ""
    : `<p class="release-description">${escapeHtml(
        cleanDescription(track.description || releaseDescription(track))
      )}</p>
  ${tagsHtml(track.tags)}`;
  return `<article class="release-card${compact ? " compact-card" : ""}">
<div class="release-art-frame">
${coverImageHtml(track, "release-art", {
  sizes: compact
    ? "(max-width: 720px) calc(100vw - 40px), 340px"
    : "(max-width: 720px) calc(100vw - 40px), (max-width: 980px) calc(50vw - 50px), 360px"
})}
</div>
<div class="release-card-body">
  <p class="release-type">${escapeHtml(releaseTypeLabel(track.releaseType))}</p>
  <h3><a href="${escapeHtml(releasePath(track))}">${escapeHtml(releaseTitle(track))}</a></h3>
  <p class="release-meta">${escapeHtml(trackMeta(track))}</p>
${details ? `  ${details}\n` : ""}  <div class="card-actions"><a class="button button-small" href="${escapeHtml(
    releasePath(track)
  )}" aria-label="查看 ${escapeHtml(releaseTitle(track))} 的作品介绍与收听链接">作品详情</a></div>
</div>
</article>`;
}

function trackListHtml(track) {
  return trackNamesFor(track)
    .map((_, index) => {
      const current = track.trackCount === 1;
      return `<a class="track-list-item" href="${escapeHtml(
        singlePath(track, index)
      )}">
  <span class="track-number">${String(index + 1).padStart(2, "0")}</span>
  <span class="track-title">${escapeHtml(songTitle(track, index))}</span>
  <span class="track-action">${current ? "当前作品" : "单曲页"}</span>
</a>`;
    })
    .join("\n");
}

function singleCardHtml(track, index) {
  return `<article class="single-card">
  <a class="single-card-link" href="${escapeHtml(singlePath(track, index))}">
    ${coverImageHtml(track, "single-card-art", { alt: "", sizes: "74px" })}
    <span class="single-card-copy">
      <span class="single-card-title">${escapeHtml(songTitle(track, index))}</span>
      <span class="single-card-release">${escapeHtml(releaseTitle(track))}</span>
    </span>
  </a>
</article>`;
}

function siteHeaderHtml() {
  return `<header class="site-header" aria-label="主导航">
  <a class="brand-mark" href="./" aria-label="${escapeHtml(site.artistName)} 首页">
    <img class="brand-icon" src="assets/optimized/brand-80.webp" width="40" height="40" alt="" aria-hidden="true">
    <span>${escapeHtml(site.artistName)}</span>
  </a>
  <nav class="nav-links" aria-label="主导航">
    <a href="./#releases">作品</a>
    <a href="./#listen">平台</a>
    <a href="./">首页</a>
  </nav>
</header>`;
}

function siteFooterHtml() {
  return `<footer class="site-footer">
  <span>${escapeHtml(site.artistName)}</span>
  <span id="footer-year">${new Date().getFullYear()}</span>
</footer>`;
}

function shareButtonHtml() {
  return `<button class="button button-ghost share-button" id="copy-share-link" type="button">
  <svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 7h-4.5A6.5 6.5 0 0 0 4 13.5V16"></path>
    <path d="M14 3l5 4-5 4"></path>
  </svg>
  <span class="share-label">分享</span>
</button>`;
}

function breadcrumbHtml(items) {
  return `<nav class="breadcrumbs" aria-label="面包屑导航"><ol>${items.map((item, index) =>
    `<li>${index === items.length - 1
      ? `<span aria-current="page">${escapeHtml(item.name)}</span>`
      : `<a href="${escapeHtml(item.path || "./")}">${escapeHtml(item.name)}</a>`}</li>`
  ).join("")}</ol></nav>`;
}

function relatedReleases(track) {
  const position = site.tracks.indexOf(track);
  return site.tracks.filter((item) => item.slug !== track.slug).sort((a, b) => {
    const genreMatch = Number(b.genre === track.genre) - Number(a.genre === track.genre);
    return genreMatch || Math.abs(site.tracks.indexOf(a) - position) - Math.abs(site.tracks.indexOf(b) - position);
  });
}

function releaseBody(track) {
  const title = releaseTitle(track);
  const related = relatedReleases(track)
    .slice(0, 3)
    .map((item) => releaseCardHtml(item, { compact: true }))
    .join("\n");
  return `<body data-page="song" data-prerendered="true" data-track="${escapeHtml(track.slug)}">
${siteHeaderHtml()}
<main class="song-page">
  ${breadcrumbHtml([{ name: "首页", path: "" }, { name: title, path: releasePath(track) }])}
  <section class="song-hero" aria-labelledby="song-title">
    ${coverImageHtml(track, "song-art", {
      alt: title + " 封面",
      loading: "eager",
      fetchPriority: "high",
      sizes: "(max-width: 980px) calc(100vw - 40px), 420px"
    })}
    <div class="song-copy">
      <p class="eyebrow" id="song-type">${escapeHtml(releaseTypeLabel(track.releaseType))}</p>
      <h1 id="song-title">${escapeHtml(title)}</h1>
      <div class="song-meta-row">
        <p class="song-meta" id="song-meta">${escapeHtml(trackMeta(track))}</p>
        ${shareButtonHtml()}
      </div>
      <p class="song-description" id="song-description">${escapeHtml(
        track.description || releaseDescription(track)
      )}</p>
      <div class="release-track-panel">
        <div class="track-list" id="track-list" aria-label="曲目列表">${trackListHtml(track)}</div>
      </div>
    </div>
  </section>
  <section class="section song-links-section" aria-labelledby="platform-title">
    <div class="section-heading">
      <p class="eyebrow">选择平台</p>
      <h2 id="platform-title">在你常用的平台打开。</h2>
    </div>
    <div class="platform-grid" id="song-links">${platformLinksHtml(track.links, {
      scope: "release",
      releaseSlug: track.slug,
      releaseTitle: title
    })}</div>
  </section>
  <section class="section more-releases" aria-labelledby="more-title">
    <div class="section-heading">
      <p class="eyebrow">继续听</p>
      <h2 id="more-title">更多 ${escapeHtml(site.artistName)} 作品。</h2>
    </div>
    <div class="release-grid compact" id="more-releases-grid">${related}</div>
  </section>
</main>
${siteFooterHtml()}
</body>`;
}

function singleBody(track, index) {
  const title = songTitle(track, index);
  const youtubeId = youtubeIdFor(track, index);
  const related = relatedReleases(track)
    .flatMap((item) => trackNamesFor(item).map((_, itemIndex) => ({ track: item, index: itemIndex })))
    .slice(0, 4)
    .map((item) => singleCardHtml(item.track, item.index))
    .join("\n");
  const video = youtubeId
    ? `<section class="section video-section" id="music-video-section" aria-labelledby="music-video-title">
    <div class="section-heading">
      <p class="eyebrow">MV</p>
      <h2 id="music-video-title">官方音乐视频。</h2>
    </div>
    <div class="video-frame" id="music-video-frame">
      <iframe src="${escapeHtml(
        youtubeEmbedUrl(youtubeId)
      )}?rel=0" title="${escapeHtml(
        title
      )} MV" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>
  </section>`
    : `<section class="section video-section" id="music-video-section" aria-labelledby="music-video-title" hidden>
    <div class="section-heading"><p class="eyebrow">MV</p><h2 id="music-video-title">官方音乐视频。</h2></div>
    <div class="video-frame" id="music-video-frame"></div>
  </section>`;
  return `<body data-page="single" data-prerendered="true" data-release="${escapeHtml(
    track.slug
  )}" data-song="${escapeHtml(songSlug(track, index))}">
${siteHeaderHtml()}
<main class="song-page single-page">
  ${breadcrumbHtml([{ name: "首页", path: "" }, { name: releaseTitle(track), path: releasePath(track) }, { name: title, path: singlePath(track, index) }])}
  <section class="song-hero" aria-labelledby="song-title">
    ${coverImageHtml(track, "song-art", {
      alt: title + " 封面",
      loading: "eager",
      fetchPriority: "high",
      sizes: "(max-width: 980px) calc(100vw - 40px), 420px"
    })}
    <div class="song-copy">
      <p class="eyebrow" id="song-type">单曲</p>
      <h1 id="song-title">${escapeHtml(title)}</h1>
      <div class="song-meta-row">
        <p class="song-meta" id="song-meta">${escapeHtml(songMeta(track))}</p>
        ${shareButtonHtml()}
      </div>
      <div class="context-actions">
        <a class="single-release-link" id="single-release-link" href="${escapeHtml(
          releasePath(track)
        )}">收录于 ${escapeHtml(releaseTitle(track))}</a>
      </div>
      <p class="song-description" id="song-description">${escapeHtml(
        track.trackDescriptions?.[index] || songDescription(track, index)
      )}</p>
    </div>
  </section>
  <section class="section song-links-section" aria-labelledby="platform-title">
    <div class="section-heading">
      <p class="eyebrow">全平台</p>
      <h2 id="platform-title">选择平台播放这首歌。</h2>
    </div>
    <div class="platform-grid" id="song-links">${platformLinksHtml(
      songPlatformLinks(track, index),
      {
        scope: "song",
        releaseSlug: track.slug,
        releaseTitle: releaseTitle(track),
        songSlug: songSlug(track, index),
        songTitle: title
      }
    )}</div>
  </section>
  ${video}
  <section class="section" aria-labelledby="album-tracks-title">
    <div class="section-heading"><p class="eyebrow">同一张作品</p><h2 id="album-tracks-title">${escapeHtml(releaseTitle(track))} 曲目。</h2></div>
    <div class="track-list">${trackListHtml(track)}</div>
  </section>
  <section class="section more-releases" aria-labelledby="more-title">
    <div class="section-heading"><p class="eyebrow">继续听</p><h2 id="more-title">更多单曲。</h2></div>
    <div class="single-grid" id="more-releases-grid">${related}</div>
  </section>
</main>
${siteFooterHtml()}
</body>`;
}

function preloadCover(track) {
  return `    <link rel="preload" as="image" href="${escapeHtml(
    track.cover || site.banner
  )}" imagesrcset="${escapeHtml(optimizedCoverPath(track, 160))} 160w, ${escapeHtml(optimizedCoverPath(track, 480))} 480w, ${escapeHtml(
    optimizedCoverPath(track, 800)
  )} 800w" imagesizes="(max-width: 980px) calc(100vw - 40px), 420px" fetchpriority="high">\n`;
}

function writePage(relativePath, html) {
  const target = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}

function replaceGeneratedBlock(html, name, content) {
  const pattern = new RegExp(
    `(<!-- mrc:${name}:start -->)[\\s\\S]*?(<!-- mrc:${name}:end -->)`
  );
  if (!pattern.test(html)) {
    throw new Error(`Could not find generated block: ${name}`);
  }
  return html.replace(pattern, (_, start, end) => `${start}\n${content}\n${end}`);
}

function generateHomePage() {
  const target = path.join(rootDir, "index.html");
  let html = fs.readFileSync(target, "utf8");
  html = html
    .replace(
      /href="styles\.css(?:\?v=[^"]*)?"/,
      `href="styles.css?v=${assetVersion}"`
    )
    .replace(
      /src="site-data\.js(?:\?v=[^"]*)?"/,
      `src="site-data.js?v=${assetVersion}"`
    )
    .replace(
      /src="app\.js(?:\?v=[^"]*)?"/,
      `src="app.js?v=${assetVersion}"`
    );
  html = replaceGeneratedBlock(html, "home-jsonld", jsonLdScript(homeStructuredData(), "    ").trim());
  html = replaceGeneratedBlock(
    html,
    "artist-links",
    platformLinksHtml(site.artistLinks, { scope: "artist" })
  );
  html = replaceGeneratedBlock(
    html,
    "release-grid",
    site.tracks.map((track) => releaseCardHtml(track)).join("\n")
  );
  fs.writeFileSync(target, html);
}

// Persist content-derived dates, rather than pretending publication dates are
// modification dates or changing every date on every build.
const seoStatePath = path.join(scriptDir, "seo-state.json");
const previousSeoState = fs.existsSync(seoStatePath)
  ? JSON.parse(fs.readFileSync(seoStatePath, "utf8"))
  : {};
const nextSeoState = {};

function pageLastModified(loc) {
  const html = fs.readFileSync(path.join(rootDir, loc, "index.html"), "utf8")
    .replace(/\?v=[a-f0-9]{12}/g, "")
    .replace(/(<span id="footer-year">)[^<]*(<\/span>)/g, "$1$2");
  const hash = createHash("sha256").update(html).digest("hex");
  const key = "/" + loc;
  const previous = previousSeoState[key];
  const lastmod = previous?.hash === hash ? previous.lastmod : new Date().toISOString().slice(0, 10);
  nextSeoState[key] = { hash, lastmod };
  return lastmod;
}

function sitemapUrl({ image, loc }) {
  return `  <url>
    <loc>${escapeXml(absoluteUrl(loc))}</loc>
    <lastmod>${escapeXml(pageLastModified(loc))}</lastmod>
    <image:image>
      <image:loc>${escapeXml(absoluteUrl(image))}</image:loc>
    </image:image>
  </url>`;
}

function generateDiscoveryFiles() {
  const sitemapEntries = [
    sitemapUrl({
      image: ogImagePath("home"),
      loc: ""
    })
  ];

  site.tracks.forEach((track) => {
    sitemapEntries.push(
      sitemapUrl({
        image: track.cover || site.banner,
        loc: releasePath(track)
      })
    );
    if (track.trackCount > 1) {
      trackNamesFor(track).forEach((_, index) => {
        sitemapEntries.push(
          sitemapUrl({
            image: track.cover || site.banner,
            loc: singlePath(track, index)
          })
        );
      });
    }
  });

  fs.writeFileSync(
    path.join(rootDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapEntries.join("\n")}
</urlset>
`
  );
  fs.writeFileSync(
    path.join(rootDir, "robots.txt"),
    `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("sitemap.xml")}
`
  );

  const redirects = ["/index.html / 301"];
  site.tracks.forEach((track) => {
    redirects.push(`/${releasePath(track)}index.html /${releasePath(track)} 301`);
    trackNamesFor(track).forEach((_, index) => {
      const source = standaloneSinglePath(track, index);
      if (track.trackCount === 1) {
        redirects.push(`/${source} /${releasePath(track)} 301`);
        redirects.push(`/${source}index.html /${releasePath(track)} 301`);
      } else {
        redirects.push(`/${source}index.html /${source} 301`);
      }
    });
  });
  fs.writeFileSync(path.join(rootDir, "_redirects"), redirects.join("\n") + "\n");
  fs.writeFileSync(seoStatePath, JSON.stringify(nextSeoState, null, 2) + "\n");
}

fs.rmSync(path.join(rootDir, "album"), { force: true, recursive: true });
fs.rmSync(path.join(rootDir, "single"), { force: true, recursive: true });
await generateOptimizedAssets();
generateOgImages();

site.tracks.forEach((track) => {
  const title = releaseTitle(track);
  const description = releaseDescription(track);
  const url = absoluteUrl(releasePath(track));

  writePage(
    path.join("album", track.slug, "index.html"),
    head({
      description,
      imageAlt: title + " 封面",
      imagePath: ogImagePath(track.slug),
      jsonLd: releaseStructuredData(track),
      musicMeta: releaseMusicMeta(track),
      ogType: "music.album",
      preloadImage: preloadCover(track),
      root: rootPrefix(2),
      title,
      titleTag: title + " | " + site.artistName,
      url
    }) +
      releaseBody(track) +
      "\n</html>\n"
  );

  if (track.trackCount > 1) {
    trackNamesFor(track).forEach((_, index) => {
    const title = songTitle(track, index);
    const description = songDescription(track, index);
    const url = absoluteUrl(singlePath(track, index));

    writePage(
      path.join("single", track.slug, songSlug(track, index), "index.html"),
      head({
        description,
        imageAlt: title + " 封面",
        imagePath: ogImagePath(track.slug),
        jsonLd: singleStructuredData(track, index),
        musicMeta: singleMusicMeta(track, index),
        ogType: "music.song",
        preloadImage: preloadCover(track),
        root: rootPrefix(3),
        title,
        titleTag: title + " - 单曲 | " + site.artistName,
        url
      }) +
        singleBody(track, index) +
        "\n</html>\n"
    );
  });
  }
});

generateHomePage();
generateDiscoveryFiles();

const songPageCount = site.tracks
  .filter((track) => track.trackCount > 1)
  .reduce((total, track) => total + trackNamesFor(track).length, 0);
console.log(
  `Generated ${site.tracks.length} release pages, ${songPageCount} canonical song pages, sitemap, redirects, and optimized images.`
);
