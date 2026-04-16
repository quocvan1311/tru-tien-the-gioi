/**
 * Logic dùng chung cho trang chi tiết BOSS: ac-mong-detail.html & luyen-nguc-detail.html
 * (layout 3 cột, ảnh, video). Giữ hành vi / class CSS như bản gốc từng trang.
 */
(function (global) {
  "use strict";

  function cellText(v) {
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) return v.join("\n");
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  function youtubeVideoId(input) {
    var s = String(input == null ? "" : input).trim();
    if (!s) return "";
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    var m = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    m = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : "";
  }

  function encodePathSegments(relPath) {
    return String(relPath || "")
      .split("/")
      .filter(function (seg) {
        return seg.length;
      })
      .map(function (seg) {
        return encodeURIComponent(seg);
      })
      .join("/");
  }

  function localVideoEntry(raw) {
    var s = String(raw == null ? "" : raw).trim();
    if (!s) return null;
    if (youtubeVideoId(s)) return null;
    if (/^https?:\/\//i.test(s)) {
      if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(s)) {
        return { kind: "file", src: s };
      }
      return null;
    }
    if (!/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(s)) return null;
    return { kind: "file", src: encodePathSegments(s) };
  }

  function findRowByDetailId(rows, wantId) {
    if (!wantId) return null;
    var idFn = global.BOSS_TABLE_DETAIL_ROW_ID;
    if (typeof idFn !== "function") return null;
    for (var i = 0; i < rows.length; i++) {
      if (idFn(rows[i]) === wantId) return rows[i];
    }
    var dec = wantId;
    try {
      dec = decodeURIComponent(wantId);
    } catch (e) {}
    if (dec !== wantId) {
      for (var j = 0; j < rows.length; j++) {
        if (idFn(rows[j]) === dec) return rows[j];
      }
    }
    return null;
  }

  function makeAcMongVideoEntriesGetter(defaultBossDetailVideoUrl) {
    return function (row) {
      var idFn = global.BOSS_TABLE_DETAIL_ROW_ID;
      if (typeof idFn !== "function") return [];
      var rid = idFn(row);
      var raw = global.AC_MONG_BOSS_VIDEOS && global.AC_MONG_BOSS_VIDEOS[rid];
      var arr = [];
      if (raw != null && raw !== "") {
        arr = Array.isArray(raw) ? raw : [raw];
      }
      var out = [];
      for (var i = 0; i < arr.length && out.length < 3; i++) {
        var y = youtubeVideoId(arr[i]);
        if (y) {
          out.push({ kind: "youtube", id: y });
          continue;
        }
        var loc = localVideoEntry(arr[i]);
        if (loc) out.push(loc);
      }
      if (out.length === 0) {
        var fbName = global.AC_MONG_TRAILER_FALLBACK_BASENAME;
        var fbBase = global.AC_MONG_TRAILER_BASE || "trailer pb 10/";
        if (fbName) {
          var join =
            String(fbBase).replace(/\/?$/, "/") +
            String(fbName).replace(/^\//, "");
          var fb = localVideoEntry(join);
          if (fb) out.push(fb);
        }
      }
      if (out.length === 0) {
        var def = youtubeVideoId(defaultBossDetailVideoUrl);
        if (def) out.push({ kind: "youtube", id: def });
      }
      return out;
    };
  }

  function makeLuyenNgucVideoEntriesGetter(defaultBossDetailVideoUrl) {
    return function (row) {
      var idFn = global.BOSS_TABLE_DETAIL_ROW_ID;
      if (typeof idFn !== "function") return [];
      var rid = idFn(row);
      var raw =
        global.LUYEN_NGUC_BOSS_VIDEOS && global.LUYEN_NGUC_BOSS_VIDEOS[rid];
      var arr = [];
      if (raw != null && raw !== "") {
        arr = Array.isArray(raw) ? raw : [raw];
      }
      var out = [];
      for (var i = 0; i < arr.length && out.length < 3; i++) {
        var y = youtubeVideoId(arr[i]);
        if (y) out.push({ kind: "youtube", id: y });
      }
      if (out.length === 0) {
        var def = youtubeVideoId(defaultBossDetailVideoUrl);
        if (def) out.push({ kind: "youtube", id: def });
      }
      return out;
    };
  }

  var YT_EMBED_ORIGIN = "https://www.youtube.com";

  function pauseBossDetailYoutubeIframe(iframe) {
    if (!iframe || !iframe.contentWindow) {
      return;
    }
    try {
      iframe.contentWindow.postMessage(
        '{"event":"command","func":"pauseVideo","args":""}',
        YT_EMBED_ORIGIN,
      );
    } catch (e) {}
  }

  function playBossDetailYoutubeIframe(iframe) {
    if (!iframe || !iframe.contentWindow) {
      return;
    }
    try {
      iframe.contentWindow.postMessage(
        '{"event":"command","func":"playVideo","args":""}',
        YT_EMBED_ORIGIN,
      );
    } catch (e) {}
  }

  /**
   * @param {object} entry
   * @param {number} vi
   * @param {string} bossName
   * @param {number} videoCount
   * @param {{allowLocalFiles: boolean, youtubeMuteFirst: boolean}} videoCfg
   * @param {{youtubeAutoplay: boolean, html5Autoplay: boolean, youtubeEnableJsApi: boolean}} playOpts
   */
  function createBossDetailVideoFrame(
    entry,
    vi,
    bossName,
    videoCount,
    videoCfg,
    playOpts,
  ) {
    var ytAuto = !!playOpts.youtubeAutoplay;
    var html5Auto = !!playOpts.html5Autoplay;
    var ytApi = !!playOpts.youtubeEnableJsApi;

    var frame = document.createElement("div");
    frame.className = "boss-detail__video-frame";
    var titleSuffix =
      bossName + (videoCount > 1 ? " — video " + (vi + 1) : "");
    if (entry.kind === "youtube") {
      var iframe = document.createElement("iframe");
      var q = new URLSearchParams();
      if (ytAuto) {
        q.set("autoplay", "1");
        if (videoCfg.youtubeMuteFirst) {
          q.set("mute", "1");
        }
      }
      if (ytApi) {
        q.set("enablejsapi", "1");
      }
      q.set("rel", "0");
      q.set("playsinline", "1");
      iframe.src =
        "https://www.youtube.com/embed/" + entry.id + "?" + q.toString();
      iframe.title = titleSuffix;
      iframe.loading = ytAuto ? "eager" : "lazy";
      iframe.setAttribute("allowfullscreen", "");
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      frame.appendChild(iframe);
    } else if (entry.kind === "file" && videoCfg.allowLocalFiles) {
      var video = document.createElement("video");
      video.src =
        typeof global.resolveRepoMediaVideoSrc === "function"
          ? global.resolveRepoMediaVideoSrc(entry.src)
          : entry.src;
      video.controls = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.title = titleSuffix;
      if (html5Auto) {
        video.autoplay = true;
      }
      frame.appendChild(video);
    }
    return frame;
  }

  function appendBossDetailVideoAside(aside, videos, bossName, videoCfg) {
    var lead = document.createElement("div");
    lead.className = "boss-detail__video-heading";
    aside.appendChild(lead);

    var stack = document.createElement("div");
    stack.className = "boss-detail__video-stack";

    if (videos.length <= 1) {
      videos.forEach(function (entry, vi) {
        var frame = createBossDetailVideoFrame(
          entry,
          vi,
          bossName,
          videos.length,
          videoCfg,
          {
            youtubeAutoplay: vi === 0,
            html5Autoplay: vi === 0,
            youtubeEnableJsApi: false,
          },
        );
        stack.appendChild(frame);
      });
      aside.appendChild(stack);
      return;
    }

    lead.classList.add("boss-detail__video-heading--tabs");
    stack.classList.add("boss-detail__video-stack--tabs");

    var btnPrev = document.createElement("button");
    btnPrev.type = "button";
    btnPrev.className = "boss-detail__video-tab-arrow boss-detail__video-tab-arrow--prev";
    btnPrev.setAttribute("aria-label", "Trailer trước");
    var prevGlyph = document.createElement("span");
    prevGlyph.className = "boss-detail__video-tab-arrow__inner";
    prevGlyph.setAttribute("aria-hidden", "true");
    prevGlyph.textContent = "\u2039";
    btnPrev.appendChild(prevGlyph);

    var btnNext = document.createElement("button");
    btnNext.type = "button";
    btnNext.className = "boss-detail__video-tab-arrow boss-detail__video-tab-arrow--next";
    btnNext.setAttribute("aria-label", "Trailer sau");
    var nextGlyph = document.createElement("span");
    nextGlyph.className = "boss-detail__video-tab-arrow__inner";
    nextGlyph.setAttribute("aria-hidden", "true");
    nextGlyph.textContent = "\u203a";
    btnNext.appendChild(nextGlyph);

    var tabs = document.createElement("div");
    tabs.className = "boss-detail__video-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Trailer");

    lead.appendChild(btnPrev);
    lead.appendChild(tabs);
    lead.appendChild(btnNext);

    var panels = [];
    var tabButtons = [];

    function pauseFrameMedia(frameEl) {
      if (!frameEl) {
        return;
      }
      var vid = frameEl.querySelector("video");
      if (vid) {
        try {
          vid.pause();
        } catch (e) {}
        return;
      }
      var iframe = frameEl.querySelector('iframe[src*="youtube.com/embed"]');
      if (iframe) {
        pauseBossDetailYoutubeIframe(iframe);
      }
    }

    function playFrameMedia(frameEl) {
      if (!frameEl) {
        return;
      }
      var vid = frameEl.querySelector("video");
      if (vid) {
        var p = vid.play();
        if (p && typeof p.catch === "function") {
          p.catch(function () {});
        }
        return;
      }
      var iframe = frameEl.querySelector('iframe[src*="youtube.com/embed"]');
      if (iframe) {
        playBossDetailYoutubeIframe(iframe);
      }
    }

    function setActiveTab(index) {
      var t;
      for (t = 0; t < tabButtons.length; t++) {
        var isOn = t === index;
        tabButtons[t].classList.toggle("boss-detail__video-tab--active", isOn);
        tabButtons[t].setAttribute("aria-selected", isOn ? "true" : "false");
        tabButtons[t].tabIndex = isOn ? 0 : -1;
        panels[t].hidden = !isOn;
        panels[t].classList.toggle("boss-detail__video-tab-panel--active", isOn);
      }
    }

    function commitTabChange(index) {
      if (index < 0 || index >= panels.length) {
        return;
      }
      var prev;
      for (prev = 0; prev < panels.length; prev++) {
        if (!panels[prev].hidden) {
          pauseFrameMedia(
            panels[prev].querySelector(".boss-detail__video-frame"),
          );
        }
      }
      setActiveTab(index);
      playFrameMedia(panels[index].querySelector(".boss-detail__video-frame"));
    }

    function currentTabIndex() {
      var i;
      for (i = 0; i < panels.length; i++) {
        if (!panels[i].hidden) {
          return i;
        }
      }
      return 0;
    }

    function activateTab(index) {
      if (index < 0 || index >= panels.length) {
        return;
      }
      if (!panels[index].hidden) {
        return;
      }
      commitTabChange(index);
    }

    btnPrev.addEventListener("click", function () {
      var n = panels.length;
      if (n < 2) {
        return;
      }
      commitTabChange((currentTabIndex() - 1 + n) % n);
    });

    btnNext.addEventListener("click", function () {
      var n = panels.length;
      if (n < 2) {
        return;
      }
      commitTabChange((currentTabIndex() + 1) % n);
    });

    videos.forEach(function (entry, vi) {
      var tabId = "boss-detail-video-tab-" + vi;
      var panelId = "boss-detail-video-panel-" + vi;

      var tabBtn = document.createElement("button");
      tabBtn.type = "button";
      tabBtn.className =
        "boss-detail__video-tab" +
        (vi === 0 ? " boss-detail__video-tab--active" : "");
      tabBtn.id = tabId;
      tabBtn.setAttribute("role", "tab");
      tabBtn.setAttribute("aria-selected", vi === 0 ? "true" : "false");
      tabBtn.setAttribute("aria-controls", panelId);
      tabBtn.setAttribute("tabindex", vi === 0 ? "0" : "-1");
      tabBtn.textContent = "Trailer " + (vi + 1);
      tabs.appendChild(tabBtn);
      tabButtons.push(tabBtn);

      var panel = document.createElement("div");
      panel.className = "boss-detail__video-tab-panel";
      panel.id = panelId;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabId);
      panel.hidden = vi !== 0;
      if (vi === 0) {
        panel.classList.add("boss-detail__video-tab-panel--active");
      }

      var frame = createBossDetailVideoFrame(
        entry,
        vi,
        bossName,
        videos.length,
        videoCfg,
        {
          youtubeAutoplay: vi === 0,
          html5Autoplay: vi === 0,
          youtubeEnableJsApi: true,
        },
      );
      panel.appendChild(frame);
      stack.appendChild(panel);
      panels.push(panel);

      tabBtn.addEventListener("click", function () {
        activateTab(vi);
      });
    });

    aside.appendChild(stack);
  }

  /**
   * @param {object} profile
   * @param {string[]} profile.cols
   * @param {object} profile.columnDisplay
   * @param {string} profile.pageTitleSuffix — ví dụ "Ác mộng 10"
   * @param {string} profile.notFoundDocTitle
   * @param {function(string): boolean} profile.fieldWide
   * @param {function(object): object[]} profile.getVideoEntries
   * @param {object[]|undefined} profile.tableData — mảng dòng (vd. AC_MONG_10_TABLE_DATA)
   * @param {{allowLocalFiles: boolean, youtubeMuteFirst: boolean}} profile.videoCfg
   */
  function mountBossDetailThreeCol(profile) {
    var errEl = document.getElementById("detail-error");
    var titleEl = document.getElementById("detail-title");
    var contentEl = document.getElementById("detail-content");
    var tableData = profile.tableData;

    if (!global.BOSS_TABLE_PREPARE || !Array.isArray(tableData)) {
      errEl.hidden = false;
      errEl.textContent = "Thiếu dữ liệu hoặc table-app.js.";
      titleEl.textContent = "Lỗi";
      return;
    }

    var prep = global.BOSS_TABLE_PREPARE(tableData, {
      columns: profile.cols,
      skipBlankRows: true,
    });
    var rows = prep.rows;
    var params = new URLSearchParams(global.location.search);
    var rawId = params.get("id");
    var row = findRowByDetailId(rows, rawId);

    if (!row) {
      errEl.hidden = false;
      errEl.textContent =
        "Không tìm thấy BOSS (thiếu hoặc sai tham số ?id= trong URL).";
      titleEl.textContent = "Không tìm thấy";
      document.title = profile.notFoundDocTitle;
      return;
    }

    contentEl.hidden = false;
    contentEl.className =
      "boss-detail__layout boss-detail__layout--ac-mong-3col";

    var bossName = cellText(row["Tên BOSS (Ác mộng)"]).trim() || "BOSS";
    titleEl.textContent = bossName;
    document.title = bossName + " — " + profile.pageTitleSuffix;

    var fmt = global.BOSS_TABLE_FORMAT_DATE;
    var fmtTuan = global.BOSS_TABLE_FORMAT_TUAN_TIEU_DIET;

    var acMongFieldBg =
      typeof global.BOSS_TABLE_AC_MONG_DETAIL_FIELD_BG === "function"
        ? global.BOSS_TABLE_AC_MONG_DETAIL_FIELD_BG(row, rows)
        : null;

    var infoCol = document.createElement("aside");
    infoCol.className = "boss-detail__aside boss-detail__info-col";
    infoCol.setAttribute("aria-label", "Thông tin BOSS");

    var fieldsInner = document.createElement("div");
    fieldsInner.className = "boss-detail__fields-inner";

    profile.cols.forEach(function (k) {
      if (k === "Ảnh" || k === "No.") return;
      var spec = profile.columnDisplay[k];
      var rawVal = row[k];
      var text;
      if (spec && spec.type === "date") {
        text = fmt(rawVal);
      } else {
        text = cellText(rawVal);
      }
      if (k === "Tuần tiêu diệt" && typeof fmtTuan === "function") {
        text = fmtTuan(text);
      }

      var wrap = document.createElement("div");
      wrap.className = "boss-detail__field";
      if (profile.fieldWide(k)) {
        wrap.classList.add("boss-detail__field--wide");
      }

      var dt = document.createElement("dt");
      dt.textContent = k;
      var dd = document.createElement("dd");
      if (acMongFieldBg && k === "Tên season") {
        var chipSeason = document.createElement("span");
        chipSeason.className = "boss-data-chip";
        chipSeason.style.backgroundColor = acMongFieldBg.season;
        chipSeason.style.borderColor =
          typeof global.BOSS_TABLE_BOSS_CHIP_BORDER_FOR_BG === "function"
            ? global.BOSS_TABLE_BOSS_CHIP_BORDER_FOR_BG(acMongFieldBg.season)
            : acMongFieldBg.season;
        chipSeason.textContent = text;
        dd.appendChild(chipSeason);
      } else if (acMongFieldBg && k === "Độ khó") {
        var chipDiff = document.createElement("span");
        chipDiff.className = "boss-data-chip boss-data-chip--difficulty";
        chipDiff.style.backgroundColor = acMongFieldBg.difficultyTier;
        chipDiff.style.borderColor =
          typeof global.BOSS_TABLE_BOSS_CHIP_BORDER_FOR_BG === "function"
            ? global.BOSS_TABLE_BOSS_CHIP_BORDER_FOR_BG(
                acMongFieldBg.difficultyTier,
              )
            : acMongFieldBg.difficultyTier;
        chipDiff.textContent = text;
        dd.appendChild(chipDiff);
      } else if (k === "Tuần tiêu diệt") {
        dd.className = "boss-detail__pre";
        dd.textContent = text;
      } else if (spec && spec.preWrap) {
        dd.className = "boss-detail__pre";
        dd.textContent = text;
      } else if (spec && spec.bossExcel) {
        dd.className = "boss-detail__boss";
        dd.style.color = row.__bossColor || "#000000";
        dd.textContent = text;
      } else {
        dd.textContent = text;
      }
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      fieldsInner.appendChild(wrap);
    });

    infoCol.appendChild(fieldsInner);

    var imagesBlock = document.createElement("section");
    imagesBlock.className = "boss-detail__images-block";

    var gallery = document.createElement("div");
    gallery.className = "boss-detail__gallery";
    var imageList = (row.__images || []).slice();
    if (imageList.length === 0) {
      var empty = document.createElement("p");
      empty.className = "boss-detail__gallery-empty";
      empty.textContent = "(Chưa có ảnh trong export)";
      gallery.appendChild(empty);
    } else {
      imageList.forEach(function (src) {
        var img = document.createElement("img");
        img.src = src;
        img.alt = bossName;
        img.loading = "lazy";
        gallery.appendChild(img);
      });
    }
    imagesBlock.appendChild(gallery);

    var imagesCol = document.createElement("aside");
    imagesCol.className = "boss-detail__aside boss-detail__images-col";
    imagesCol.setAttribute("aria-label", "Ảnh BOSS");
    imagesCol.appendChild(imagesBlock);

    var videos = profile.getVideoEntries(row);

    var aside = document.createElement("aside");
    aside.className = "boss-detail__aside boss-detail__aside--videos";
    aside.setAttribute("aria-label", "Video BOSS");
    appendBossDetailVideoAside(aside, videos, bossName, profile.videoCfg);

    if (typeof global.initBossDetailVideoPopout === "function") {
      global.initBossDetailVideoPopout(aside);
    }

    contentEl.appendChild(infoCol);
    contentEl.appendChild(imagesCol);
    contentEl.appendChild(aside);
  }

  var AC_MONG_DETAIL_COLS = [
    "No.",
    "Index",
    "Tên season",
    "Ngày ra mắt",
    "Ngày tiêu diệt",
    "Tuần tiêu diệt",
    "Số ngày",
    "Tên BOSS (Ác mộng)",
    "Tên phụ bản",
    "Kỹ năng",
    "Độ khó",
    "Ghi chú",
    "Ảnh",
  ];

  var AC_MONG_DETAIL_COLUMN_DISPLAY = {
    "Ngày ra mắt": { type: "date" },
    "Ngày tiêu diệt": { type: "date" },
    "Kỹ năng": { preWrap: true },
    "Tên BOSS (Ác mộng)": { preWrap: true, bossExcel: true },
    "Ghi chú": { preWrap: true },
    Ảnh: { type: "images" },
  };

  var LUYEN_DETAIL_COLS = [
    "No.",
    "Index",
    "Tên season",
    "Ngày ra mắt",
    "Ngày tiêu diệt",
    "Tuần tiêu diệt",
    "Số ngày",
    "Tên BOSS (Ác mộng)",
    "Tên phụ bản",
    "Độ khó",
    "Ghi chú",
    "Ảnh",
  ];

  var LUYEN_DETAIL_COLUMN_DISPLAY = {
    "Ngày ra mắt": { type: "date" },
    "Ngày tiêu diệt": { type: "date" },
    "Tên BOSS (Ác mộng)": { preWrap: true, bossExcel: true },
    "Tên phụ bản": { preWrap: true },
    "Ghi chú": { preWrap: true },
    Ảnh: { type: "images" },
  };

  /**
   * Gọi sau khi gán window.AC_MONG_BOSS_VIDEOS (nếu cần) và load script/data.
   * @param {string} defaultBossDetailVideoUrl
   */
  global.mountAcMong10BossDetailPage = function (defaultBossDetailVideoUrl) {
    mountBossDetailThreeCol({
      tableData: global.AC_MONG_10_TABLE_DATA,
      cols: AC_MONG_DETAIL_COLS,
      columnDisplay: AC_MONG_DETAIL_COLUMN_DISPLAY,
      pageTitleSuffix: "Ác mộng 10",
      notFoundDocTitle: "Không tìm thấy — Ác mộng 10",
      fieldWide: function (k) {
        return k === "Kỹ năng" || k === "Ghi chú" || k === "Tên phụ bản";
      },
      getVideoEntries: makeAcMongVideoEntriesGetter(defaultBossDetailVideoUrl),
      videoCfg: { allowLocalFiles: true, youtubeMuteFirst: false },
    });
  };

  /**
   * Gọi sau khi gán window.LUYEN_NGUC_BOSS_VIDEOS (nếu cần).
   * @param {string} defaultBossDetailVideoUrl
   */
  global.mountLuyenNguc10BossDetailPage = function (defaultBossDetailVideoUrl) {
    mountBossDetailThreeCol({
      tableData: global.LUYEN_NGUC_10_TABLE_DATA,
      cols: LUYEN_DETAIL_COLS,
      columnDisplay: LUYEN_DETAIL_COLUMN_DISPLAY,
      pageTitleSuffix: "Luyện ngục 10",
      notFoundDocTitle: "Không tìm thấy — Luyện ngục 10",
      fieldWide: function (k) {
        return k === "Ghi chú" || k === "Tên phụ bản";
      },
      getVideoEntries: makeLuyenNgucVideoEntriesGetter(
        defaultBossDetailVideoUrl,
      ),
      videoCfg: { allowLocalFiles: false, youtubeMuteFirst: true },
    });
  };
})(typeof window !== "undefined" ? window : this);
