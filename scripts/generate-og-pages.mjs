import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
const releaseShell = readBody("song.html");
const singleShell = readBody("single.html");

function readBody(file) {
  const html = fs.readFileSync(path.join(rootDir, file), "utf8");
  const match = html.match(/<body\b[\s\S]*<\/body>/);
  if (!match) {
    throw new Error("Could not find body in " + file);
  }
  return match[0];
}

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
  return pairedTitle(trackNamesFor(track)[index], track.trackNamesZh && track.trackNamesZh[index]);
}

function releasePath(track) {
  return "album/" + encodeURIComponent(track.slug) + "/";
}

function singlePath(track, index) {
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

function head({
  description,
  imageAlt,
  imagePath,
  musicMeta = "",
  ogType,
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
    <link rel="canonical" href="${escapeHtml(url)}">
${meta("og:title", title)}${meta("og:type", ogType)}${meta("og:url", url)}${meta("og:site_name", site.artistName)}${meta("og:locale", "zh_CN")}${meta("og:description", description)}${meta("og:image", imageUrl)}${meta("og:image:secure_url", imageUrl)}${meta("og:image:type", image.mime)}${meta("og:image:width", String(image.width))}${meta("og:image:height", String(image.height))}${meta("og:image:alt", imageAlt)}${musicMeta}${nameMeta("twitter:card", "summary_large_image")}${nameMeta("twitter:title", title)}${nameMeta("twitter:description", description)}${nameMeta("twitter:image", imageUrl)}    <link rel="stylesheet" href="styles.css">
    <script src="site-data.js" defer></script>
    <script src="app.js" defer></script>
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

function writePage(relativePath, html) {
  const target = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}

fs.rmSync(path.join(rootDir, "album"), { force: true, recursive: true });
fs.rmSync(path.join(rootDir, "single"), { force: true, recursive: true });
generateOgImages();

site.tracks.forEach((track) => {
  const title = releaseTitle(track);
  const description = cleanDescription(track.description) || `${title} - ${site.artistName}`;
  const url = absoluteUrl(releasePath(track));
  const body = releaseShell.replace(
    '<body data-page="song">',
    `<body data-page="song" data-track="${escapeHtml(track.slug)}">`
  );

  writePage(
    path.join("album", track.slug, "index.html"),
    head({
      description,
      imageAlt: title + " 封面",
      imagePath: ogImagePath(track.slug),
      musicMeta: releaseMusicMeta(track),
      ogType: "music.album",
      root: rootPrefix(2),
      title,
      titleTag: title + " | " + site.artistName,
      url
    }) +
      body +
      "\n</html>\n"
  );

  trackNamesFor(track).forEach((_, index) => {
    const title = songTitle(track, index);
    const description =
      cleanDescription(track.description) || `收录于 ${releaseTitle(track)} - ${site.artistName}`;
    const url = absoluteUrl(singlePath(track, index));
    const body = singleShell.replace(
      '<body data-page="single">',
      `<body data-page="single" data-release="${escapeHtml(track.slug)}" data-song="${escapeHtml(
        songSlug(track, index)
      )}">`
    );

    writePage(
      path.join("single", track.slug, songSlug(track, index), "index.html"),
      head({
        description,
        imageAlt: title + " 封面",
        imagePath: ogImagePath(track.slug),
        musicMeta: singleMusicMeta(track, index),
        ogType: "music.song",
        root: rootPrefix(3),
        title,
        titleTag: title + " | " + site.artistName,
        url
      }) +
        body +
        "\n</html>\n"
    );
  });
});

console.log("Generated OGP pages for " + site.tracks.length + " releases.");
