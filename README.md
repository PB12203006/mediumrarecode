# medium rare code static site

Static music portfolio for medium rare code. The site has a mobile-friendly home page and platform-neutral release links.
The public UI is Chinese-first while release titles display as `English（中文）`.

## Files

- `index.html` is the home page.
- `album/kitten-rain/` is the generated share page for a release.
- `single/kitten-rain/kitten-rain/` is the generated share page for a specific song.
- `song.html?track=kitten-rain` and `single.html?release=kitten-rain&song=kitten-rain` are legacy JS shells.
- `site-data.js` contains artist links, release metadata, and per-platform URLs.
- `app.js` attaches sharing and platform analytics to the static pages without rebuilding their content; it still renders the legacy query-string shells.
- `scripts/generate-og-pages.mjs` generates per-release and per-song static HTML with Open Graph metadata.
- `scripts/check-site.mjs` validates canonical pages, sitemap entries, structured data, redirects, images, and internal links.
- `scripts/seo-state.json` records the content hash and last significant modification date for each canonical page. Keep it in Git so unchanged rebuilds preserve sitemap dates.
- `styles.css` contains the visual system.
- `assets/medium-rare-code-background-2026.jpg` is the current local banner image.
- `assets/medium-rare-code-logo-2026.png`, `assets/favicon-48-2026.png`, and `assets/apple-touch-icon-2026.png` provide the current navigation, browser-tab, and saved-shortcut branding.
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
npm run build
```

The build:

- refreshes `assets/og/` so release and single share cards use 1200x630 images;
- generates responsive 160px, 480px, and 800px cover images;
- prerenders the home page, release pages, and multi-track song pages with complete HTML;
- emits linked WebSite, WebPage, artist, album, recording, and breadcrumb entities, with the correct EP release type;
- adds visible breadcrumbs, descriptive title links, genre-related releases, and sibling-song links;
- updates `robots.txt`, `sitemap.xml`, `_redirects`, and canonical metadata;
- updates sitemap modification dates only when page content changes;
- validates all public pages, metadata uniqueness, semantic entity references, sitemap dates, and reachability from the home page.

Canonical pages do not load `site-data.js`; their complete content and platform URLs
are in HTML. Their `data-prerendered="true"` flag tells `app.js` to attach behavior
without replacing the DOM. The navigation uses an 80px WebP logo instead of the
full-size branding PNG. Cover preloads and visible images use matching responsive
image candidates to avoid duplicate image requests.

Single-track releases use their `/album/release-slug/` page as the only canonical
page. Their former `/single/release-slug/song-slug/` URLs permanently redirect
to the release page. Multi-track releases keep one canonical song page per
track.

## Search indexing

The canonical page set is listed in `sitemap.xml`, and `robots.txt` advertises
that sitemap. Submit this URL after verifying the domain in Google Search
Console:

```text
https://mediumrarecode.com/sitemap.xml
```

The top-level `404.html` prevents Cloudflare Pages from serving the home page
with a successful status for unknown URLs. Legacy query-string shells remain
available for old links, but use `noindex,follow` and redirect visitors to the
matching canonical static page.

`_headers` excludes the production `mediumrarecode.pages.dev` alias and versioned
preview hosts from indexing, while leaving the custom domain indexable. Keep
`www.mediumrarecode.com` permanently redirected to `https://mediumrarecode.com`
at Cloudflare's zone rules layer, preserving the path and query string. Domain
redirects cannot be configured in Pages' `_redirects` file.

Production uses the Cloudflare Pages project `mediumrarecode` in the
`mediumrarecode@gmail.com` account. It automatically deploys GitHub's `main`
branch, with no remote build command: run `npm run build` locally and commit the
generated HTML, images, sitemap, and SEO state together before pushing. The CLI's
default Cloudflare login may belong to another project; do not deploy to that
account. Roll back a publication through the Pages deployment history or revert
its Git commit and push again.

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
`platform_clickthrough` for the conversion funnel. Each click also emits a
dashboard-friendly platform event such as `platform_clickthrough_spotify` or
`platform_clickthrough_apple-music`, because Cloudflare custom dashboards do
not expose nested Track Data properties as readable grouping dimensions. No
visitor identifier, full destination URL, or other personal data is added by
the site. Event properties are:

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
6. In a custom Cloudflare dashboard, group Track by event name and filter Track
   to values beginning with `platform_clickthrough_` to show clicks by platform.

Use the event properties to break the result down by platform, release, song,
or link scope. The Cloudflare free allowance includes 1,000,000 Zaraz events
per account each month.
