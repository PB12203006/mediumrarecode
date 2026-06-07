(function () {
  const site = window.MRC_SITE;

  if (!site) {
    return;
  }

  const page = document.body.dataset.page;

  function byId(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text) {
      node.textContent = text;
    }
    return node;
  }

  function link(label, href, className) {
    const node = el("a", className || "platform-link", label);
    node.href = href;
    node.target = "_blank";
    node.rel = "noreferrer";
    return node;
  }

  function internalLink(label, href, className) {
    const node = el("a", className, label);
    node.href = href;
    return node;
  }

  function platformSlug(label) {
    const slugs = {
      "Apple Music": "apple-music",
      "YouTube Music": "youtube-music",
      "Spotify": "spotify",
      "网易云": "netease-cloud-music",
      "Amazon Music": "amazon-music",
      "iHeart": "iheart"
    };
    return (
      slugs[label] ||
      label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    );
  }

  function platformIcon(label) {
    const icons = {
      "Apple Music": "assets/logos/apple-music.svg",
      "YouTube Music": "assets/logos/youtube-music.svg",
      "Spotify": "assets/logos/spotify.svg",
      "网易云": "assets/logos/netease-cloud-music.svg",
      "Amazon Music": "assets/logos/amazon-music.svg",
      "iHeart": "assets/logos/iheart.svg"
    };
    return icons[label];
  }

  function clear(node) {
    if (node) {
      node.replaceChildren();
    }
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value + "T00:00:00");
    return new Intl.DateTimeFormat("zh-CN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function releaseTypeLabel(type) {
    const labels = {
      Single: "单曲",
      EP: "EP"
    };
    return labels[type] || type;
  }

  function pairedTitle(english, chinese) {
    return chinese ? english + "（" + chinese + "）" : english;
  }

  function releaseTitle(track) {
    return pairedTitle(track.title, track.titleZh);
  }

  function trackName(track, name, index) {
    const chinese = track.trackNamesZh && track.trackNamesZh[index];
    return pairedTitle(name, chinese);
  }

  function trackNamesFor(track) {
    return track.trackNames && track.trackNames.length ? track.trackNames : [track.title];
  }

  function slugify(value) {
    const slug = value
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

  function releaseUrl(track) {
    return new URL(
      "song.html?track=" + encodeURIComponent(track.slug),
      window.location.href
    ).toString();
  }

  function singleUrl(track, index) {
    const url = new URL("single.html", window.location.href);
    url.searchParams.set("release", track.slug);
    url.searchParams.set("song", songSlug(track, index));
    return url.toString();
  }

  function trackMeta(track) {
    return [releaseTypeLabel(track.releaseType), formatDate(track.released), track.genre, track.length]
      .filter(Boolean)
      .join(" / ");
  }

  function songMeta(song) {
    const meta = ["单曲", formatDate(song.release.released), song.release.genre];
    if (song.release.trackCount === 1 && song.release.length) {
      meta.push(song.release.length);
    }
    return meta.filter(Boolean).join(" / ");
  }

  function coverFor(track) {
    return track.cover || site.banner;
  }

  function artistLink(label) {
    return site.artistLinks.find((item) => item.label === label);
  }

  function searchUrl(base, title) {
    return base + encodeURIComponent((site.platformSearchName || site.artistName) + " " + title);
  }

  function searchLinksForSong(song) {
    const title = song.title;
    const neteaseTitle = song.titleZh || song.title;
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
        label: "网易云",
        url: searchUrl("https://music.163.com/#/search/m/?s=", neteaseTitle)
      },
      {
        label: "Amazon Music",
        url: searchUrl("https://music.amazon.com/search/", title)
      },
      {
        label: "iHeart",
        url: (artistLink("iHeart") || site.artistLinks[0]).url
      }
    ];
  }

  function songAt(track, index) {
    const names = trackNamesFor(track);
    const safeIndex = Math.max(0, Math.min(index, names.length - 1));
    return {
      release: track,
      index: safeIndex,
      slug: songSlug(track, safeIndex),
      title: names[safeIndex],
      titleZh: track.trackNamesZh && track.trackNamesZh[safeIndex]
    };
  }

  function allSongs() {
    return site.tracks.flatMap((track) => {
      return trackNamesFor(track).map((name, index) => songAt(track, index));
    });
  }

  function songTitle(song) {
    return pairedTitle(song.title, song.titleZh);
  }

  function songPlatformLinks(song) {
    if (song.release.trackCount === 1) {
      return song.release.links;
    }
    if (song.release.links && song.release.links.length === 1) {
      return song.release.links;
    }
    return searchLinksForSong(song);
  }

  function renderTags(tags) {
    const list = el("div", "tag-list");
    tags.forEach((tag) => {
      list.append(el("span", "tag", tag));
    });
    return list;
  }

  function renderReleaseCard(track, options) {
    const card = el(
      "article",
      options && options.compact ? "release-card compact-card" : "release-card"
    );

    const art = el("div", "release-art");
    art.setAttribute("role", "img");
    art.setAttribute("aria-label", releaseTitle(track) + " 封面");
    art.style.backgroundImage = "url('" + coverFor(track) + "')";
    card.append(art);

    const body = el("div", "release-card-body");
    body.append(el("p", "release-type", releaseTypeLabel(track.releaseType)));
    body.append(el("h3", "", releaseTitle(track)));
    body.append(el("p", "release-meta", trackMeta(track)));

    if (!options || !options.compact) {
      if (track.description) {
        body.append(el("p", "release-description", track.description));
      }
      body.append(renderTags(track.tags));
    }

    const actions = el("div", "card-actions");
    actions.append(internalLink("专辑详情", releaseUrl(track), "button button-small"));
    body.append(actions);
    card.append(body);
    return card;
  }

  function renderTrackList(container, track) {
    clear(container);
    trackNamesFor(track).forEach((name, index) => {
      const song = songAt(track, index);
      const item = internalLink("", singleUrl(track, index), "track-list-item");
      item.setAttribute("aria-label", songTitle(song) + " 单曲页");

      item.append(el("span", "track-number", String(index + 1).padStart(2, "0")));
      item.append(el("span", "track-title", trackName(track, name, index)));
      item.append(el("span", "track-action", "单曲页"));
      container.append(item);
    });
  }

  function renderPlatformLinks(container, links) {
    clear(container);
    links.forEach((item) => {
      const node = link("", item.url, "platform-link");
      const slug = platformSlug(item.label);
      const label = el("span", "platform-name");
      const icon = platformIcon(item.label);

      if (icon) {
        const iconWrap = el("span", "platform-logo platform-logo-" + slug);
        const image = el("img");
        image.src = icon;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        iconWrap.append(image);
        label.append(iconWrap);
      }

      label.append(el("span", "platform-label", item.label));
      node.append(label);
      container.append(node);
    });
  }

  function renderHome() {
    const releaseGrid = byId("release-grid");
    const artistLinks = byId("artist-links");

    clear(releaseGrid);
    site.tracks.forEach((track) => {
      releaseGrid.append(renderReleaseCard(track));
    });

    renderPlatformLinks(artistLinks, site.artistLinks);
  }

  function selectedTrack() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("track") || window.location.hash.replace("#", "");
    return site.tracks.find((track) => track.slug === slug) || site.tracks[0];
  }

  function selectedSingle() {
    const params = new URLSearchParams(window.location.search);
    const releaseSlug = params.get("release") || params.get("track") || "";
    const track = site.tracks.find((item) => item.slug === releaseSlug) || site.tracks[0];
    const value = params.get("song") || params.get("index");
    const names = trackNamesFor(track);

    if (!value) {
      return songAt(track, 0);
    }

    const numeric = Number(value);
    if (Number.isInteger(numeric)) {
      if (numeric >= 1 && numeric <= names.length) {
        return songAt(track, numeric - 1);
      }
      if (numeric >= 0 && numeric < names.length) {
        return songAt(track, numeric);
      }
    }

    const index = names.findIndex((name, itemIndex) => {
      return name && songSlug(track, itemIndex) === value;
    });
    return songAt(track, index === -1 ? 0 : index);
  }

  function attachCopyButton(button, share, defaultText) {
    if (!button) {
      return;
    }
    const label = button.querySelector(".share-label") || button;
    const setLabel = (text) => {
      label.textContent = text;
    };
    button.addEventListener("click", () => {
      if (!navigator.clipboard) {
        setLabel("未复制");
        return;
      }
      navigator.clipboard
        .writeText(share)
        .then(() => {
          setLabel("已复制");
          window.setTimeout(() => {
            setLabel(defaultText);
          }, 1600);
        })
        .catch(() => {
          setLabel("未复制");
        });
    });
  }

  function renderSong() {
    const track = selectedTrack();
    const share = releaseUrl(track);
    const title = releaseTitle(track);

    document.title = site.artistName + " - " + title;
    byId("song-type").textContent = releaseTypeLabel(track.releaseType);
    byId("song-title").textContent = title;
    byId("song-meta").textContent = trackMeta(track);
    byId("song-description").textContent = track.description || "";

    const art = document.querySelector(".song-art");
    if (art) {
      art.setAttribute("role", "img");
      art.setAttribute("aria-label", title + " 封面");
      art.style.backgroundImage = "url('" + coverFor(track) + "')";
    }

    const trackList = byId("track-list");
    if (trackList) {
      renderTrackList(trackList, track);
    }

    renderPlatformLinks(byId("song-links"), track.links);

    const copy = byId("copy-share-link");
    attachCopyButton(copy, share, "分享");

    const more = byId("more-releases-grid");
    clear(more);
    site.tracks
      .filter((item) => item.slug !== track.slug)
      .slice(0, 3)
      .forEach((item) => {
        more.append(renderReleaseCard(item, { compact: true }));
      });
  }

  function renderSingle() {
    const song = selectedSingle();
    const track = song.release;
    const share = singleUrl(track, song.index);
    const title = songTitle(song);

    document.title = site.artistName + " - " + title;
    byId("song-type").textContent = "单曲";
    byId("song-title").textContent = title;
    byId("song-meta").textContent = songMeta(song);

    const description = byId("song-description");
    if (description) {
      description.textContent = track.trackCount === 1 ? track.description || "" : "";
    }

    const releaseLink = byId("single-release-link");
    if (releaseLink) {
      releaseLink.href = releaseUrl(track);
      releaseLink.textContent = "收录于 " + releaseTitle(track);
    }

    const art = document.querySelector(".song-art");
    if (art) {
      art.setAttribute("role", "img");
      art.setAttribute("aria-label", title + " 封面");
      art.style.backgroundImage = "url('" + coverFor(track) + "')";
    }

    renderPlatformLinks(byId("song-links"), songPlatformLinks(song));
    attachCopyButton(byId("copy-share-link"), share, "分享");

    const more = byId("more-releases-grid");
    clear(more);
    allSongs()
      .filter((item) => item.release.slug !== track.slug || item.index !== song.index)
      .slice(0, 4)
      .forEach((item) => {
        const card = el("article", "single-card");
        const cardLink = internalLink("", singleUrl(item.release, item.index), "single-card-link");
        const thumb = el("span", "single-card-art");
        thumb.style.backgroundImage = "url('" + coverFor(item.release) + "')";
        cardLink.append(thumb);

        const text = el("span", "single-card-copy");
        text.append(el("span", "single-card-title", songTitle(item)));
        text.append(el("span", "single-card-release", releaseTitle(item.release)));
        cardLink.append(text);
        card.append(cardLink);
        more.append(card);
      });
  }

  function initFooter() {
    const year = byId("footer-year");
    if (year) {
      year.textContent = String(new Date().getFullYear());
    }
  }

  initFooter();

  if (page === "home") {
    renderHome();
  }

  if (page === "song") {
    renderSong();
  }

  if (page === "single") {
    renderSingle();
  }
})();
