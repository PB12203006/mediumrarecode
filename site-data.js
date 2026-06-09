window.MRC_SITE = (() => {
  const artistName = "medium rare code / 半熟代码";
  const platformSearchName = "medium rare code";
  const spotifyArtist = "https://open.spotify.com/artist/2yPc2lAxvMXOk5NdcpaM5M";
  const appleArtist = "https://music.apple.com/us/artist/medium-rare-code/1866278790";
  const youtubeArtist = "https://music.youtube.com/search?q=Medium%20Rare%20Code";
  const neteaseArtist = "https://music.163.com/#/artist?id=122312763";
  const amazonArtist = "https://music.amazon.com/artists/B0GDX63WH8/medium-rare-code";
  const iheartArtist = "https://www.iheart.com/artist/medium-rare-code-49181288/";

  function searchUrl(base, title) {
    return base + encodeURIComponent(platformSearchName + " " + title);
  }

  function neteaseSong(id) {
    return "https://music.163.com/#/song?id=" + id;
  }

  function neteaseAlbum(id) {
    return "https://music.163.com/#/album?id=" + id;
  }

  function trackCountLabel(count) {
    return count === 1 ? "1 首" : count + " 首";
  }

  function release(data) {
    const links = data.links || [
      {
        label: "Apple Music",
        url: data.appleUrl || searchUrl("https://music.apple.com/us/search?term=", data.title),
        primary: true
      },
      {
        label: "YouTube Music",
        url: searchUrl("https://music.youtube.com/search?q=", data.title)
      },
      {
        label: "Spotify",
        url: searchUrl("https://open.spotify.com/search/", data.title)
      },
      {
        label: "网易云",
        url: data.neteaseUrl || searchUrl("https://music.163.com/#/search/m/?s=", data.title)
      },
      {
        label: "Amazon Music",
        url: searchUrl("https://music.amazon.com/search/", data.title)
      },
      {
        label: "iHeart",
        url: iheartArtist
      }
    ];

    return {
      ...data,
      tags: [data.genre, trackCountLabel(data.trackCount), data.released.slice(0, 4)],
      links
    };
  }

  return {
    artistName,
    platformSearchName,
    baseUrl: "https://mediumrarecode.com/",
    banner: "assets/medium-rare-code-banner.jpeg",
    artistLinks: [
      {
        label: "Apple Music",
        url: appleArtist
      },
      {
        label: "YouTube Music",
        url: youtubeArtist
      },
      {
        label: "Spotify",
        url: spotifyArtist
      },
      {
        label: "网易云",
        url: neteaseArtist
      },
      {
        label: "Amazon Music",
        url: amazonArtist
      },
      {
        label: "iHeart",
        url: iheartArtist
      }
    ],
    tracks: [
      release({
        slug: "collapse",
        title: "Collapse",
        titleZh: "摇摇欲坠",
        releaseType: "Single",
        released: "2026-06-05",
        length: "3:42",
        genre: "Alternative",
        trackCount: 1,
        cover: "assets/covers/collapse.jpg",
        appleUrl: "https://music.apple.com/us/album/collapse-single/6777000292",
        neteaseUrl: neteaseAlbum(379987900),
        trackNames: ["Collapse"],
        trackNamesZh: ["摇摇欲坠"],
        description: [
          "扫地机器人终于战胜了衣架",
          "Damn 这像极了我们摇摇欲坠的生活"
        ].join("\n")
      }),
      release({
        slug: "kitten-rain",
        title: "Kitten Rain",
        releaseType: "Single",
        released: "2026-04-20",
        length: "3:12",
        genre: "Jazz",
        trackCount: 1,
        cover: "assets/covers/kitten-rain.jpg",
        appleUrl: "https://music.apple.com/us/album/kitten-rain-single/1895340791",
        neteaseUrl: neteaseSong(3372706736),
        trackNames: ["Kitten Rain"],
        trackNamesZh: ["衣服下小猫雨"],
        description: [
          "衣服下起小猫雨",
          "毛绒绒的钻进你的毛衣里",
          "没有闪电只有软软的踩踏",
          "一步一步踩碎大人的规矩"
        ].join("\n")
      }),
      release({
        slug: "razor-sharp",
        title: "Razor Sharp",
        titleZh: "爆桶",
        releaseType: "Single",
        released: "2026-04-20",
        length: "2:47",
        genre: "House",
        trackCount: 1,
        cover: "assets/covers/razor-sharp.jpg",
        appleUrl: "https://music.apple.com/us/album/razor-sharp-single/1895235415",
        neteaseUrl: neteaseSong(3372712803),
        trackNames: ["Razor Sharp"],
        trackNamesZh: ["爆桶"],
        description: [
          "我们是 razor clam大 pro！ Oh yeah!",
          "爆桶！爆桶！绝无空军的 title！",
          "看准小沙眼铲子一挥管你躲多深通通带走",
          "七十！八十！数到手抽筋嘴角疯狂上疯狂上翘",
          "今天这片海滩上我们绝对是最嚣张的崽！"
        ].join("\n")
      }),
      release({
        slug: "snow-check-not-today",
        title: "Snow Check, Not Today",
        releaseType: "Single",
        released: "2026-04-19",
        length: "7:54",
        genre: "R&B/Soul",
        trackCount: 2,
        cover: "assets/covers/snow-check-not-today.jpg",
        appleUrl: "https://music.apple.com/us/album/snow-check-not-today-single/1894795227",
        neteaseUrl: neteaseAlbum(372077031),
        trackNames: ["Snow Check", "Not Today"],
        trackNamesZh: ["不交卷的周末", "不交卷的周末"],
        description: [
          "我只想 抱着自由 不想提前交卷",
          "在这 快节奏的时代 留一点点空间",
          "没经过 他的允许 怎敢 让他出现？",
          "万一他 也不想 参与这 疲惫的冒险",
          "不去 轻易打扰 是我 给的成全",
          "我自己的 剧本 还要 慢慢地翻篇"
        ].join("\n")
      }),
      release({
        slug: "return-and-distance",
        title: "Return and Distance",
        titleZh: "归途与远方",
        releaseType: "Single",
        released: "2026-04-19",
        length: "2:57",
        genre: "Pop",
        trackCount: 1,
        cover: "assets/covers/return-and-distance.jpg",
        appleUrl: "https://music.apple.com/us/album/return-and-distance-single/1895111604",
        neteaseUrl: neteaseSong(3372711108),
        trackNames: ["Return and Distance"],
        trackNamesZh: ["归途与远方"],
        description: [
          "这一年 最值得纪念的瞬间",
          "是牵起姥姥姥爷 微微勾楼的肩",
          "飞越过大洋彼岸 降落在西雅图的天",
          "看加拿大的枫叶 染红了笑脸"
        ].join("\n")
      }),
      release({
        slug: "mango-akita-in-the-party",
        title: "Mango(Akita) in the Party",
        titleZh: "唯一的秋田",
        releaseType: "Single",
        released: "2026-04-07",
        length: "1:42",
        genre: "Pop",
        trackCount: 1,
        cover: "assets/covers/mango-akita-in-the-party.jpg",
        appleUrl: "https://music.apple.com/us/album/mango-akita-in-the-party-single/1892163851",
        neteaseUrl: neteaseSong(3367614357),
        trackNames: ["Mango(Akita) in the Party"],
        trackNamesZh: ["唯一的秋田"],
        description: "真正的狠角色 往往话很少"
      }),
      release({
        slug: "powder-flu",
        title: "Powder Flu",
        titleZh: "请病假去滑雪才是一件很嘻哈的事情",
        releaseType: "Single",
        released: "2026-03-04",
        length: "8:54",
        genre: "Hip-Hop/Rap",
        trackCount: 3,
        cover: "assets/covers/powder-flu.jpg",
        appleUrl: "https://music.apple.com/us/album/powder-flu-single/1882546811",
        trackNames: [
          "Powder Flu (Black Diamond Ver.)",
          "Powder Flu (Bluebird Day Ver.)",
          "White Escape"
        ],
        trackNamesZh: [
          "请病假去滑雪才是一件很嘻哈的事情",
          "请病假去滑雪才是一件很嘻哈的事情",
          "白色逃亡"
        ],
        neteaseUrl: neteaseAlbum(364676671),
        description: [
          "请个假去滑雪 是一场浪漫的逃亡",
          "不管什么kpi 把它留在没雪的橱窗",
          "换上我的雪板 冲向白色的乌托邦",
          "这才是属于我们 独家的疯狂"
        ].join("\n")
      }),
      release({
        slug: "side-by-side",
        title: "Side by Side",
        releaseType: "Single",
        released: "2026-02-18",
        length: "4:00",
        genre: "Alternative",
        trackCount: 1,
        cover: "assets/covers/side-by-side.jpg",
        appleUrl: "https://music.apple.com/us/album/side-by-side-single/1878888979",
        neteaseUrl: neteaseSong(3351153232),
        trackNames: ["Side by Side"],
        trackNamesZh: ["双影同踪"]
      }),
      release({
        slug: "solo-author",
        title: "Solo Author",
        titleZh: "独作",
        releaseType: "Single",
        released: "2026-01-09",
        length: "2:29",
        genre: "Pop",
        trackCount: 1,
        cover: "assets/covers/solo-author.jpg",
        appleUrl: "https://music.apple.com/us/album/solo-author-single/1867725965",
        neteaseUrl: neteaseSong(3337581601),
        trackNames: ["Solo Author"],
        trackNamesZh: ["独作"],
        description:
          "一首献给挚友的“学术战歌”。从 West Coast 到 East Coast，跨越三千英里的距离，致敬 并肩成长的岁月。"
      }),
      release({
        slug: "no-red-rocks-in-miami",
        title: "No Red Rocks in Miami",
        titleZh: "迈阿密没有Red Rock",
        releaseType: "Single",
        released: "2026-01-08",
        length: "2:02",
        genre: "Pop",
        trackCount: 1,
        cover: "assets/covers/no-red-rocks-in-miami.jpg",
        appleUrl: "https://music.apple.com/us/album/no-red-rocks-in-miami-single/1867417702",
        neteaseUrl: neteaseSong(3337369817),
        trackNames: ["No Red Rocks in Miami"],
        trackNamesZh: ["迈阿密没有Red Rock"],
        description:
          "当西雅图 Puget Sound 的海风撞上迈阿密南沙滩的暖阳，一场跨越经纬度的“塑料兄弟情”在音符中爆发。"
      }),
      release({
        slug: "tian-luo-girl",
        title: "Tian-Luo Girl",
        titleZh: "田螺姑娘",
        releaseType: "Single",
        released: "2026-01-06",
        length: "3:02",
        genre: "Rock",
        trackCount: 1,
        cover: "assets/covers/tian-luo-girl.jpg",
        appleUrl: "https://music.apple.com/us/album/tian-luo-girl-single/1866813658",
        neteaseUrl: neteaseSong(3336377346),
        trackNames: ["Tian-Luo Girl"],
        trackNamesZh: ["田螺姑娘"],
        description: [
          "生活很难，但你总是那个把日子变出花样的魔术师。 丰富多彩才是真相。",
          "",
          "献给我的田螺姑娘。"
        ].join("\n")
      }),
      release({
        slug: "rain-of-two-cities",
        title: "Rain of Two Cities",
        titleZh: "雨的两座城",
        releaseType: "Single",
        released: "2026-01-06",
        length: "3:54",
        genre: "Folk",
        trackCount: 1,
        cover: "assets/covers/rain-of-two-cities.jpg",
        appleUrl: "https://music.apple.com/us/album/rain-of-two-cities-single/1866829217",
        neteaseUrl: neteaseSong(3336337046),
        trackNames: ["Rain of Two Cities"],
        trackNamesZh: ["雨的两座城"],
        description: [
          "从太平洋西北岸如旧棉被般的温柔，到旧街巷里那种狂野的泥土芬芳。这首歌拒绝了常人眼中“加州阳光”式的明媚，转而拥抱一种更真实、更有质感的灰色。",
          "",
          "当世界都在追逐晴朗，我们是否忽略了雨水带来的宁静？ 在喧嚣的白噪音中，有人听到了烦躁，而有人听到了归属。 这就不仅是一次对天气的记录，更是一次关于“内心秩序”的重建。 雨后的清香，胜过一切虚假的晴朗。"
        ].join("\n")
      }),
      release({
        slug: "six-tails-of-christmas",
        title: "Six Tails of Christmas",
        titleZh: "平安夜的尾巴",
        releaseType: "EP",
        released: "2026-01-06",
        length: "12:35",
        genre: "R&B/Soul",
        trackCount: 4,
        cover: "assets/covers/six-tails-of-christmas.jpg",
        appleUrl: "https://music.apple.com/us/album/six-tails-of-christmas-ep/1866840340",
        neteaseUrl: neteaseAlbum(357276508),
        trackNames: ["Wang Wang", "Paws & Pause", "Fireplace & Fur", "Furry and the Bright"],
        trackNamesZh: ["汪汪", "爪子与暂停键", "壁炉与毛茸茸", "暖绒与流光"],
        description: [
          "本张专辑收录了来自平安夜的真实采样：壁炉的燃烧声、酒杯的碰撞声，以及狗狗们均匀的呼吸声。没有复杂的编曲，只有最纯粹的 Chill 节奏。",
          "",
          "Olly / Mochi / Mango(x2) / Doge / Lucky —— 它们是今晚的主角，也是这几首歌的灵感缪斯。",
          "",
          "戴上耳机，Lay it back。 把烦恼留在门外，今晚我们只负责放松。"
        ].join("\n")
      }),
      release({
        slug: "shadow-of-the-snout",
        title: "Shadow of the Snout",
        titleZh: "长吻之影：审判降临",
        releaseType: "Single",
        released: "2026-01-06",
        length: "2:40",
        genre: "Comedy",
        trackCount: 1,
        cover: "assets/covers/shadow-of-the-snout.jpg",
        appleUrl: "https://music.apple.com/us/album/shadow-of-the-snout-single/1866819107",
        neteaseUrl: neteaseSong(3336319628),
        trackNames: ["Shadow of the Snout"],
        trackNamesZh: ["长吻之影：审判降临"],
        description: [
          "谁说长脸狗狗不能拥有自己的 Boss Fight BGM？Lucky 和 Oreo 化身古神，带给你来自“车座子”的终极压迫感。颤抖吧螃蟹！",
          "",
          "#EpicMusic #Sheltie #Iggy #Funny #NewMusic"
        ].join("\n")
      }),
      release({
        slug: "mango-in-the-party",
        title: "Mango in the Party",
        releaseType: "Single",
        released: "2026-01-06",
        length: "2:00",
        genre: "Pop",
        trackCount: 1,
        cover: "assets/covers/mango-in-the-party.jpg",
        appleUrl: "https://music.apple.com/us/album/mango-in-the-party-single/1867061085",
        neteaseUrl: neteaseSong(3351177236),
        trackNames: ["Mango in the Party"]
      }),
      release({
        slug: "long-years-with-you",
        title: "Long Years With You",
        titleZh: "陪你度过漫长岁月",
        releaseType: "EP",
        released: "2026-05-20",
        length: "17:27",
        genre: "Mandopop",
        trackCount: 5,
        cover: "assets/covers/long-years-with-you.jpg",
        neteaseUrl: neteaseAlbum(377477263),
        links: [
          {
            label: "网易云",
            url: neteaseAlbum(377477263)
          }
        ],
        trackNames: [
          "Standard Answer to Happiness",
          "The Longest Romance",
          "A World Wide Enough",
          "Two Backpacks on the Road",
          "Timezone Variables and Old Friend Constants"
        ],
        trackNamesZh: [
          "幸福标准答案",
          "最长情的浪漫",
          "世界辽阔刚刚好",
          "两只背包的旅途",
          "时区变量与老友常数"
        ],
        songSlugs: [
          "standard-answer-to-happiness",
          "the-longest-romance",
          "a-world-wide-enough",
          "two-backpacks-on-the-road",
          "timezone-variables-and-old-friend-constants"
        ],
        description: [
          "这世界辽阔的刚刚好 适合结伴去感触",
          "最美的从来不是终点 而是同行的脚步"
        ].join("\n")
      })
    ]
  };
})();
