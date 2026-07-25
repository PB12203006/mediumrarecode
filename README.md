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
- `assets/favicon.png` and `assets/apple-touch-icon.png` are cropped from the logo banner for browser tabs and saved shortcuts.
- `assets/covers/` contains crawled 1000x1000 release artwork from Apple Music artwork URLs.
- `assets/og/` contains generated 1200x630 Open Graph images for large share cards.
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
Set `youtubeIds` with one YouTube video ID per song to show an embedded MV on its single page.

After editing `site-data.js`, regenerate the static Open Graph pages:

```sh
node scripts/generate-og-pages.mjs
```

The generator also refreshes `assets/og/` so release and single share cards use 1200x630 images.

## Local preview

The site works by opening `index.html` directly. For a closer match to deployment, run:

```sh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Cloudflare clickthrough analytics

Platform buttons emit a Cloudflare Zaraz custom event named
`platform_clickthrough`. No visitor identifier, full destination URL, or other
personal data is added by the site. Event properties are:

- `platform` and `platform_name`
- `link_scope` (`artist`, `release`, or `song`)
- `page_type`
- `release_slug` and `release_title` when relevant
- `song_slug` and `song_title` when relevant
- `destination_host`
- `platform_position`

The tracking call is a no-op when Zaraz is unavailable, so local development
and non-Cloudflare previews continue to work normally.

To activate collection for the proxied production domain:

1. In the Cloudflare dashboard, open the `mediumrarecode.com` zone and go to
   Zaraz.
2. Add and enable at least one Zaraz tool. Zaraz only injects its Web API when
   an enabled tool exists. A no-op Custom HTML tool is enough when Cloudflare
   Monitoring is the only analytics destination.
3. In Zaraz Settings, leave Auto-inject script and Automatic Pageview Tracking
   enabled.
4. Enable Advanced Monitoring so sessions and funnels are available.
5. In Zaraz Monitoring, build a funnel from `Pageview` to
   `platform_clickthrough`. This session funnel is the clickthrough conversion
   rate; dividing raw event counts can overstate conversion when one visitor
   opens more than one platform.

Use the event properties to break the result down by platform, release, song,
or link scope. The Cloudflare free allowance includes 1,000,000 Zaraz events
per account each month.
