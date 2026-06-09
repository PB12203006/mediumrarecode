# medium rare code static site

Static music portfolio for medium rare code. The site has a mobile-friendly home page and platform-neutral release links.
The public UI is Chinese-first while release titles display as `English（中文）`.

## Files

- `index.html` is the home page.
- `album/kitten-rain/` is the generated share page for a release.
- `single/kitten-rain/kitten-rain/` is the generated share page for a specific song.
- `song.html?track=kitten-rain` and `single.html?release=kitten-rain&song=kitten-rain` are legacy JS shells.
- `site-data.js` contains artist links, release metadata, and per-platform URLs.
- `app.js` renders the home page, release pages, and single pages from the data file.
- `scripts/generate-og-pages.mjs` generates per-release and per-song static HTML with Open Graph metadata.
- `styles.css` contains the visual system.
- `assets/medium-rare-code-banner.jpeg` is the local banner image.
- `assets/covers/` contains crawled 1000x1000 release artwork from Apple Music artwork URLs.
- `assets/logos/` contains local SVG platform logos used in platform buttons.

## Add or edit a release

Update the `tracks` array in `site-data.js`.

Each release needs a stable `slug`. The platform-neutral URL is:

```text
album/your-slug/
```

Each song gets a generated single URL based on its release slug and song title:

```text
single/your-slug/generated-song-slug/
```

When the site is deployed, that becomes a shareable link like:

```text
https://your-domain.example/album/your-slug/
https://your-domain.example/single/your-slug/generated-song-slug/
```

Set `cover` to a local image path such as `assets/covers/kitten-rain.jpg`.
Keep `title` as the English release title for search links, set `titleZh` only when the release or album itself has a Chinese title, and use `trackNamesZh` for song titles.
Set `description` from the NetEase album description when it is available and relevant.
Set `neteaseUrl` to the exact NetEase song or album page when available.

After editing `site-data.js`, regenerate the static Open Graph pages:

```sh
node scripts/generate-og-pages.mjs
```

## Local preview

The site works by opening `index.html` directly. For a closer match to deployment, run:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```
