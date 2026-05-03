(function () {
  "use strict";

  let rawRows = [];
  const STORAGE_KEY_SORT_STATE =
    window.location.pathname.split("/").pop() + "-sortState";
  let sortState = window.localStorage.getItem(STORAGE_KEY_SORT_STATE)
    ? JSON.parse(window.localStorage.getItem(STORAGE_KEY_SORT_STATE))
    : { key: null, dir: 1 };

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) Object.assign(node, props);
    if (children) children.forEach(c => node.appendChild(c));
    return node;
  }

  function cellText(v) {
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) return v.join("\n");
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  function adjustColor(hex, satDelta = 0, lightDelta = 0) {
    // 1. Convert Hex to RGB
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    // 2. Convert RGB to HSL
    let max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }

    // 3. LOGIC THÔNG MINH (Smart Scaling)
    // Thay vì cộng thẳng, ta tính toán dựa trên khoảng trống còn lại (Remaining Space)
    let delta = lightDelta / 100;

    if (delta > 0) {
      // Nếu làm sáng (Lighter): Càng sáng thì tăng càng ít
      // Công thức: L_mới = L_cũ + (Khoảng_còn_lại_tới_trắng * %_muốn_tăng)
      l = l + (1 - l) * delta;
    } else {
      // Nếu làm đậm (Bolder): Càng tối thì giảm càng ít
      // Công thức: L_mới = L_cũ + (Khoảng_còn_lại_tới_đen * %_muốn_giảm)
      l = l + l * delta;
    }

    // Điều chỉnh Saturation (giữ nguyên logic cũ hoặc áp dụng tương tự nếu muốn)
    s = Math.min(1, Math.max(0, s + satDelta / 100));

    // 4. Convert HSL back to RGB
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);

    const toHex = x => {
      const val = Math.round(x * 255).toString(16);
      return val.length === 1 ? "0" + val : val;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Tooltip preview: fixed, ảnh trong tip rộng đúng 20vw; neo bên phải thumbnail, kẹp vào viewport.
   */
  function layoutBossListImageTip(hover, tip, thumbEl) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const gap = 8;
    const hr = thumbEl.getBoundingClientRect();
    const big = tip.querySelector("img");

    const imgW = vw * 0.24;
    if (big) {
      big.style.maxWidth = imgW + "px";
      big.style.display = "block";
      big.style.objectFit = "contain";
      big.style.boxSizing = "border-box";
    }

    tip.style.position = "fixed";
    tip.style.boxSizing = "border-box";
    tip.style.left = "-99999px";
    tip.style.top = "0";
    tip.style.visibility = "visible";
    tip.style.opacity = "0";

    const tipOuterW = tip.offsetWidth;
    let tipH = tip.offsetHeight;
    if (tipH < 6) {
      tipH = Math.min(vh * 0.72, 448);
    }

    const leftBase = hr.right + gap;
    let left = leftBase;
    if (left + tipOuterW > vw - margin) {
      left = vw - margin - tipOuterW;
    }
    if (left < margin) {
      left = margin;
    }

    let top = hr.top + hr.height / 2 - tipH / 2;
    top = Math.max(margin, Math.min(top, vh - margin - tipH));

    tip.style.left = Math.round(left) + "px";
    tip.style.top = Math.round(top) + "px";
    tip.style.opacity = "";
  }

  function bindBossTableImageTip(hover, tip, thumbEl) {
    const big = tip.querySelector("img");
    let raf = null;
    let listenersAttached = false;
    let closeTimer = null;
    let overHover = false;
    let overTip = false;

    function cancelCloseTimer() {
      if (closeTimer !== null) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    }

    function scheduleMaybeClose() {
      cancelCloseTimer();
      closeTimer = setTimeout(function () {
        closeTimer = null;
        if (!overHover && !overTip) {
          closeTip();
        }
      }, 75);
    }

    function scheduleLayout() {
      if (raf != null) {
        return;
      }
      raf = window.requestAnimationFrame(function () {
        raf = null;
        if (!hover.classList.contains("boss-table-img-hover--tip-active")) {
          return;
        }
        layoutBossListImageTip(hover, tip, thumbEl);
      });
    }

    function onWinScrollOrResize() {
      scheduleLayout();
    }

    function openTip() {
      cancelCloseTimer();
      hover.classList.add("boss-table-img-hover--tip-active");
      document.body.appendChild(tip);
      tip.classList.add("boss-table-img-hover__tip--open");
      layoutBossListImageTip(hover, tip, thumbEl);
      if (!listenersAttached) {
        listenersAttached = true;
        window.addEventListener("scroll", onWinScrollOrResize, true);
        window.addEventListener("resize", onWinScrollOrResize);
      }
    }

    function closeTip() {
      cancelCloseTimer();
      overHover = false;
      overTip = false;
      hover.classList.remove("boss-table-img-hover--tip-active");
      tip.classList.remove("boss-table-img-hover__tip--open");
      hover.appendChild(tip);
      tip.style.width = "";
      tip.style.maxWidth = "";
      tip.style.left = "";
      tip.style.top = "";
      tip.style.position = "";
      tip.style.opacity = "";
      tip.style.visibility = "";
      if (big) {
        big.style.width = "";
        big.style.maxWidth = "";
        big.style.height = "";
        big.style.display = "";
        big.style.objectFit = "";
        big.style.boxSizing = "";
      }
      if (listenersAttached) {
        listenersAttached = false;
        window.removeEventListener("scroll", onWinScrollOrResize, true);
        window.removeEventListener("resize", onWinScrollOrResize);
      }
      if (raf != null) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
    }

    hover.addEventListener("mouseenter", function () {
      overHover = true;
      cancelCloseTimer();
      if (!hover.classList.contains("boss-table-img-hover--tip-active")) {
        openTip();
      } else {
        scheduleLayout();
      }
    });

    hover.addEventListener("mouseleave", function () {
      overHover = false;
      scheduleMaybeClose();
    });

    hover.addEventListener("mousemove", scheduleLayout);

    tip.addEventListener("mouseenter", function () {
      overTip = true;
      cancelCloseTimer();
    });

    tip.addEventListener("mouseleave", function () {
      overTip = false;
      scheduleMaybeClose();
    });

    if (big) {
      big.addEventListener("load", function () {
        if (hover.classList.contains("boss-table-img-hover--tip-active")) {
          scheduleLayout();
        }
      });
    }
  }

  /**
   * Listing: bọc ảnh + tooltip preview (CSS .boss-table-img-hover).
   */
  function appendListingImageWithHoverPreview(parent, img, row) {
    const hover = document.createElement("span");
    hover.className = "boss-table-img-hover";
    const tip = document.createElement("span");
    tip.className = "boss-table-img-hover__tip";
    const color = adjustColor(
      difficultyColumnBgAcMong(row["Độ khó"]) || "#000000",
      70,
      -14,
    );
    tip.style.borderColor = color;
    tip.style.backgroundColor = color;
    const big = document.createElement("img");
    big.src = img.src;
    big.alt = img.alt || "";
    big.decoding = "async";
    big.loading = "lazy";
    tip.appendChild(big);
    hover.appendChild(img);
    hover.appendChild(tip);
    parent.appendChild(hover);
    bindBossTableImageTip(hover, tip, img);
  }

  /** Lowercase + bỏ dấu tiếng Việt (và đ/Đ → d) để so khớp ô search. */
  function foldVi(s) {
    return String(s)
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .toLowerCase();
  }

  /** Column "Ảnh" reads row.__images (paths from export); not a real data key. */
  function rowValueForColumn(row, key) {
    if (key === "Ảnh") {
      const imgs = row.__images;
      return imgs && imgs.length ? imgs.join(" ") : "";
    }
    return row[key];
  }

  /** Màu ô — theo Tru Tien BOSS.xlsm (Tên season / Tuần / Mùa / Độ khó) */
  const SEASON_BG_PALETTE = [
    "#93eaff",
    "#d6c1ff",
    "#ffff99",
    "#c5e1a5",
    "#ffccbc",
    "#b39ddb",
    "#90caf9",
    "#fff59d",
  ];
  /** Tuần tiêu diệt 1…5 (Excel); tuần > 5 lặp theo modulo */
  const WEEK_BG_PALETTE = [
    "#66ff99",
    "#d9b3ff",
    "#ffff00",
    "#ffdbb7",
    "#ccecff",
  ];
  /** Phụ bản 5 — cột Mùa (Excel) */
  const PHU_BAN_MUA_BG = Object.assign(Object.create(null), {
    1: "#93eaff",
    2: "#d6c1ff",
    3: "#ffff99",
  });
  const TUAN_TIEU_DIET_RE = /Tu[ầa]n\s*(\d+)/i;

  function hashString(s) {
    let h = 0;
    const str = String(s);
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function buildSeasonBgMap(rows, seasonKey) {
    const order = [];
    const seen = new Set();
    rows.forEach(function (r) {
      const name = String(r[seasonKey] ?? "").trim();
      if (!seen.has(name)) {
        seen.add(name);
        order.push(name);
      }
    });
    const map = Object.create(null);
    order.forEach(function (name, i) {
      map[name] = SEASON_BG_PALETTE[i % SEASON_BG_PALETTE.length];
    });
    return map;
  }

  function parseTuanTieuDietWeek(s) {
    if (s == null || s === "") return null;
    const m = String(s).match(TUAN_TIEU_DIET_RE);
    return m ? parseInt(m[1], 10) : null;
  }

  /** Số nguyên đầu tiên trong chuỗi Index (vd. "233", "x231-2" → 233). */
  function firstIntegerInString(s) {
    const m = String(s ?? "").match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }

  /**
   * Màu season theo bảng Ác mộng: mỗi số đầu trong Index → cùng màu với dòng Ác mộng
   * có Index đó (thứ tự palette giống ac-mong-10).
   */
  function buildAcMongSeasonBgByIndexFirstNum(acMongRows, seasonKey) {
    if (!acMongRows || !acMongRows.length) return null;
    const seasonMap = buildSeasonBgMap(acMongRows, seasonKey);
    const map = Object.create(null);
    acMongRows.forEach(function (r) {
      const fi = firstIntegerInString(r["Index"]);
      if (fi == null) return;
      const sn = String(r[seasonKey] ?? "").trim();
      let bg = seasonMap[sn];
      if (!bg) {
        bg = SEASON_BG_PALETTE[hashString(sn) % SEASON_BG_PALETTE.length];
      }
      map[fi] = bg;
    });
    return map;
  }

  function parseDifficultyNumber(v) {
    if (v == null) return null;
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
      const x = parseFloat(String(v).trim().replace(",", "."));
      return Number.isNaN(x) ? null : x;
    }
    return null;
  }

  /** Độ khó — Ác mộng 10 (Excel): ≥1000 / ≥750 / ≥500 / <500 */
  function difficultyColumnBgAcMong(v) {
    const n = parseDifficultyNumber(v);
    if (n == null) return "#ffffff";
    if (n >= 1000) return "#fe666a";
    if (n >= 750) return "#5abbff";
    if (n >= 500) return "#ffff99";
    return "#ccffcc";
  }

  /** Viền chip cùng tông với nền, đậm hơn một chút (không dùng xám trung tính cố định). */
  function bossChipBorderForBackground(bg) {
    return adjustColor(bg, 75, -48);
  }

  /** Chưa có ngày tiêu diệt — bảng listing không hiển thị chip Độ khô */
  function isNgayTieuDietEmpty(row) {
    const v = row["Ngày tiêu diệt"];
    if (v == null) return true;
    return String(v).trim() === "";
  }

  function isDoKhoValueEmpty(raw) {
    const num = parseDifficultyNumber(raw);
    return num == null || num === 999;
  }

  function makeAcMongNgucCellBgResolver(
    rows,
    seasonKey,
    acMongRowsForIndexSeason,
  ) {
    const seasonMap = buildSeasonBgMap(rows, seasonKey);
    const indexToSeasonBg = buildAcMongSeasonBgByIndexFirstNum(
      acMongRowsForIndexSeason,
      seasonKey,
    );
    return function resolve(row, colKey) {
      const sn = String(row[seasonKey] ?? "").trim();
      let seasonBg = null;
      const fi = firstIntegerInString(row["Index"]);
      if (indexToSeasonBg && fi != null && indexToSeasonBg[fi] != null) {
        seasonBg = indexToSeasonBg[fi];
      }
      if (!seasonBg) {
        seasonBg = seasonMap[sn];
      }
      if (!seasonBg) {
        seasonBg = SEASON_BG_PALETTE[hashString(sn) % SEASON_BG_PALETTE.length];
      }
      const w = parseTuanTieuDietWeek(row["Tuần tiêu diệt"]);
      const weekBg =
        w != null && w >= 1
          ? WEEK_BG_PALETTE[(w - 1) % WEEK_BG_PALETTE.length]
          : "#eeeeee";
      if (colKey === "Ghi chú") return "#ffffff";
      /* Ác mộng 10: chưa nhập Tuần tiêu diệt → các ô ngày/tuần/số ngày trắng (chip Độ khó do renderTable) */
      if (isNgayTieuDietEmpty(row)) {
        if (
          colKey === "Ngày tiêu diệt" ||
          colKey === "Tuần tiêu diệt" ||
          colKey === "Số ngày"
        ) {
          return "#ffffff";
        }
      }
      if (
        colKey === "Ngày tiêu diệt" ||
        colKey === "Tuần tiêu diệt" ||
        colKey === "Số ngày"
      ) {
        return weekBg;
      }
      /* Độ khó: nền ô trắng; màu tier hiển thị bằng chip trong renderTable */
      if (
        colKey === "Độ khó" ||
        colKey === "Ảnh" ||
        colKey === "Tên BOSS (Ác mộng)"
      ) {
        return adjustColor(difficultyColumnBgAcMong(row["Độ khó"]), -28, 55);
      }
      return seasonBg;
    };
  }

  function makePhuBanCellBgResolver() {
    return function resolve(row) {
      const key = String(row["Mùa"] ?? "").trim();
      let bg = PHU_BAN_MUA_BG[key];
      if (!bg) {
        bg = SEASON_BG_PALETTE[hashString(key) % SEASON_BG_PALETTE.length];
      }
      return bg;
    };
  }

  function makeCellBgResolver(tableOptions, rows) {
    const mode = tableOptions.cellBgMode;
    if (!mode) return null;
    if (mode === "phu-ban") return makePhuBanCellBgResolver();
    if (mode === "ac-mong") {
      return makeAcMongNgucCellBgResolver(
        rows,
        tableOptions.seasonKey || "Tên season",
      );
    }
    if (mode === "luyen-nguc") {
      const acRef =
        tableOptions.acMongRowsForSeasonColor !== undefined
          ? tableOptions.acMongRowsForSeasonColor
          : window.BOSS_TABLE_AC_MONG_ROWS || window.AC_MONG_10_TABLE_DATA;
      return makeAcMongNgucCellBgResolver(
        rows,
        tableOptions.seasonKey || "Tên season",
        acRef,
      );
    }
    return null;
  }

  /** Display ISO / date strings as DD-MM-YYYY (date part only, no TZ shift for YYYY-MM-DD). */
  function formatDateDDMMYYYY(value) {
    if (value === null || value === undefined || value === "") return "";
    const s = String(value).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[3] + "-" + m[2] + "-" + m[1];
    const t = Date.parse(s);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return day + "-" + month + "-" + d.getFullYear();
    }
    return s;
  }

  /** "Tuần 4, chủ nhật" → hai dòng (giữ nguyên nếu không có dấu phẩy). */
  function formatTuanTieuDietTwoLines(s) {
    const t = String(s ?? "").trim();
    if (!t) return "";
    const i = t.indexOf(",");
    if (i === -1) return t;
    const a = t.slice(0, i).trim();
    const b = t.slice(i + 1).trim();
    if (!b) return a;
    return a + "\n" + b;
  }

  function normalizeForSort(v) {
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) return v.join("\n").toLowerCase();
    if (typeof v === "number") return v;
    const s = String(v).trim();
    const n = Number(s.replace(",", "."));
    if (s !== "" && !Number.isNaN(n) && /^-?\d/.test(s)) return n;
    return s.toLowerCase();
  }

  function collectKeys(rows) {
    const set = new Set();
    rows.forEach(row => {
      Object.keys(row).forEach(k => set.add(k));
    });
    return Array.from(set);
  }

  function isRowBlank(row, keys) {
    return keys.every(k => !cellText(rowValueForColumn(row, k)).trim());
  }

  /** URL-safe id from boss name + Index (or No.) — detail page ?id=… */
  function bossDetailRowId(row) {
    const name = row["Tên BOSS (Ác mộng)"];
    let s = cellText(name).trim();
    if (!s) s = "boss";
    s = s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = s || "boss";
    const raw =
      row["Index"] !== undefined && row["Index"] !== null
        ? cellText(row["Index"])
        : cellText(row["No."]);
    const token = String(raw).replace(/[^a-zA-Z0-9._-]/g, "") || "0";
    return slug + "-" + token;
  }

  /** id dòng Phụ bản 5 — ?id=… trên phu-ban-5-detail.html */
  function phuBanDetailRowId(row) {
    let pb = cellText(row["Tên phụ bản"]).trim() || "phu-ban";
    pb = pb
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const no = String(row["No."] ?? "").replace(/[^\d]/g, "") || "0";
    const mua = String(row["Mùa"] ?? "").replace(/[^\d]/g, "") || "0";
    return "phu-ban-" + no + "-" + mua + "-" + (pb || "map");
  }

  function summaryBySeason(rows, seasonKey, emptyLabel) {
    const fallback = emptyLabel || "(no season name)";
    const m = Object.create(null);
    rows.forEach(r => {
      const label = cellText(r[seasonKey]).trim() || fallback;
      m[label] = {
        count: (m[label]?.count || 0) + 1,
        point: (m[label]?.point || 0) + (r["Độ khó"] || 0),
      };
    });
    return m;
  }

  function filterRows(rows, q, columnKeysForSearch, foldDiacritics) {
    if (!q || !String(q).trim()) return rows.slice();
    const needleRaw = String(q).trim();
    const useFold = foldDiacritics !== false;
    const needle = useFold ? foldVi(needleRaw) : needleRaw.toLowerCase();
    const keysToUse =
      columnKeysForSearch && columnKeysForSearch.length
        ? columnKeysForSearch
        : null;
    return rows.filter(row => {
      const kList = keysToUse || Object.keys(row);
      return kList.some(k => {
        const text = cellText(rowValueForColumn(row, k));
        const hay = useFold ? foldVi(text) : text.toLowerCase();
        return hay.includes(needle);
      });
    });
  }

  function sortRows(rows, key, dir) {
    if (!key) return rows.slice();
    return rows.slice().sort((a, b) => {
      const av = normalizeForSort(rowValueForColumn(a, key));
      const bv = normalizeForSort(rowValueForColumn(b, key));
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  function renderTable(
    container,
    keys,
    rows,
    columnWidths,
    tableExtraClass,
    columnDisplay,
    detailBaseUrl,
    resolveCellBg,
    getRowDetailId,
    cellBgMode,
  ) {
    columnDisplay = columnDisplay || {};
    container.innerHTML = "";
    let cls = "data-table" + (columnWidths ? " data-table--fixed" : "");
    if (tableExtraClass) cls += " " + tableExtraClass;
    const table = el("table", { className: cls.trim() });
    if (detailBaseUrl) {
      table.dataset.detailBase = detailBaseUrl;
    }
    let anyCellBg = false;
    if (columnWidths) {
      const cg = document.createElement("colgroup");
      keys.forEach(k => {
        const col = document.createElement("col");
        const w = columnWidths[k];
        if (w) col.style.width = w;
        cg.appendChild(col);
      });
      table.appendChild(cg);
    }
    const thead = el("thead");
    const trh = el("tr");
    keys.forEach(k => {
      const th = el("th", { textContent: k, title: "Sort" });
      th.dataset.sortKey = k;
      th.dataset.col = k;
      if (sortState.key === k) {
        th.classList.add(sortState.dir === 1 ? "sort-asc" : "sort-desc");
      }
      if (k === "No." || k === "Mùa" || k === "Index" || k === "Độ khó") {
        th.style.textAlign = "center";
      }
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    const tbody = el("tbody");
    rows.forEach((row, rowIndex) => {
      const tr = el("tr");
      if (detailBaseUrl) {
        tr.classList.add("data-table__row--detail");
        tr.dataset.rowDetailId = getRowDetailId(row);
        tr.setAttribute("tabindex", "0");
        tr.setAttribute("role", "link");
      }
      keys.forEach(k => {
        const spec = columnDisplay[k];
        const raw = row[k];
        let text;
        if (spec && spec.type === "date") {
          text = formatDateDDMMYYYY(raw);
        } else {
          text = cellText(raw);
        }
        if (k === "Tuần tiêu diệt") {
          text = formatTuanTieuDietTwoLines(text);
        }
        if (k === "No.") {
          text = rowIndex + 1;
        }
        const td = document.createElement("td");
        td.dataset.col = k;
        if (spec && spec.type === "images") {
          td.className = "cell-images";
          const wrap = document.createElement("div");
          wrap.className = "boss-image-strip";
          const list = (row.__images || []).slice(0, 3);
          list.forEach(function (src) {
            const img = document.createElement("img");
            img.src = src;
            img.alt = "";
            img.loading = "lazy";
            appendListingImageWithHoverPreview(wrap, img, row);
          });
          td.appendChild(wrap);
        } else if (spec && spec.type === "bossWithImage") {
          td.className = "cell-boss-with-img";
          const nameWrap = document.createElement("div");
          nameWrap.className = "boss-cell__name";
          nameWrap.textContent = text;
          nameWrap.style.whiteSpace = "pre-wrap";
          td.appendChild(nameWrap);
          const rawPaths = row.__bossImages && row.__bossImages[k];
          const paths = Array.isArray(rawPaths)
            ? rawPaths.slice(0, 2)
            : rawPaths
              ? [rawPaths]
              : [];
          if (paths.length) {
            const fig = document.createElement("div");
            fig.className = "boss-cell__fig";
            paths.forEach(function (src) {
              const img = document.createElement("img");
              img.src = src;
              img.alt = text;
              img.loading = "lazy";
              appendListingImageWithHoverPreview(fig, img, row);
            });
            td.appendChild(fig);
          }
        } else if (
          k === "Độ khó" &&
          (cellBgMode === "ac-mong" || cellBgMode === "luyen-nguc")
        ) {
          /* Có ngày tiêu diệt + có độ khó mới hiển thị chip; không thì ô trống */
          if (isDoKhoValueEmpty(raw)) {
            td.textContent = "";
          } else {
            const chip = document.createElement("span");
            chip.className = "boss-data-chip boss-data-chip--difficulty";
            chip.textContent = text;
            const tierBg = difficultyColumnBgAcMong(raw);
            chip.style.backgroundColor = tierBg;
            chip.style.borderColor = bossChipBorderForBackground(tierBg);
            chip.style.boxShadow = `
              inset 0 2px 2px rgba(255, 255, 255, 0.4),
              -1px 1px 0.5px ${adjustColor(tierBg, 60, -28)},
              -0.5px 3px 1px ${adjustColor(tierBg, 75, -50)}
            `;
            chip.style.letterSpacing = "0.0375em";
            td.appendChild(chip);
          }
          if (spec && spec.noWrap) td.style.whiteSpace = "nowrap";
        } else {
          if (k === "Tên BOSS (Ác mộng)") {
            td.style.fontFamily = "Calistoga, cursive";
            td.style.letterSpacing = "0.0625em";
            td.appendChild(document.createTextNode(text));
            var iconImg = document.createElement("img");
            iconImg.className = "boss-table__title-icon";
            iconImg.src =
              "boss%20icon/" + encodeURIComponent(row["Index"]) + ".webp";
            iconImg.alt = "";
            iconImg.loading = "eager";
            iconImg.decoding = "async";
            iconImg.addEventListener("error", function () {
              iconImg.remove();
            });
            td.appendChild(iconImg);
          } else {
            td.textContent = text;
          }
          if (k === "Tuần tiêu diệt") {
            td.style.whiteSpace = "pre-line";
            td.classList.add("cell-tuan-tieu-diet");
          } else if (spec && spec.preWrap) {
            td.style.whiteSpace = "pre-wrap";
          } else if (spec && spec.noWrap) {
            td.style.whiteSpace = "nowrap";
          }
          if (spec && spec.bossExcel) {
            td.style.fontWeight = "700";
            td.style.color = row.__bossColor || "#000000";
            td.style.fontSize = row.__bossColor ? "1.125rem" : "1.025rem";
          }
        }
        const derivedBg = resolveCellBg ? resolveCellBg(row, k) : null;
        if (derivedBg) {
          td.style.backgroundColor = derivedBg;
          anyCellBg = true;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    if (anyCellBg) {
      table.classList.add("excel-ac-mong--fills");
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
  }

  function refresh(
    container,
    keys,
    searchInput,
    columnWidths,
    tableExtraClass,
    columnDisplay,
    detailBaseUrl,
    keysForSearch,
    searchFold,
    paintStatus,
    resolveCellBg,
    getRowDetailId,
    cellBgMode,
  ) {
    let rows = filterRows(
      rawRows,
      searchInput ? searchInput.value : "",
      keysForSearch,
      searchFold,
    );
    rows = sortRows(rows, sortState.key, sortState.dir);
    renderTable(
      container,
      keys,
      rows,
      columnWidths,
      tableExtraClass,
      columnDisplay,
      detailBaseUrl,
      resolveCellBg,
      getRowDetailId,
      cellBgMode,
    );
    if (typeof paintStatus === "function") paintStatus(rows.length);
    if (detailBaseUrl && typeof getRowDetailId === "function") {
      window.__BOSS_TABLE_LISTING_FOR_JUMP__ = {
        rows: rows,
        detailBase: detailBaseUrl,
        detailRowId: getRowDetailId,
      };
    }
  }

  function runTable(data, title, tableOptions) {
    tableOptions = tableOptions || {};
    const columnOrder = tableOptions.columns;
    const columnWidths = tableOptions.columnWidths;
    const columnDisplay = tableOptions.columnDisplay || {};
    const tableExtraClass = tableOptions.tableExtraClass || "";
    const skipBlankRows = !!tableOptions.skipBlankRows;
    const seasonKey = tableOptions.seasonKey || "Tên season";
    const showSeasonStats = tableOptions.showSeasonStats !== false;
    const statusLocale = tableOptions.statusLocale || "en";
    const detailBaseUrl = tableOptions.detailPage || "";
    const seasonChipPrefix = tableOptions.seasonChipPrefix || "";
    const seasonSummaryOrder = Array.isArray(tableOptions.seasonSummaryOrder)
      ? tableOptions.seasonSummaryOrder
      : null;
    const cellBgMode = tableOptions.cellBgMode;

    const statusEl = document.getElementById("status");
    const tableWrap = document.getElementById("table-wrap");
    const searchInput = document.getElementById("search");
    const pageTitle = document.getElementById("page-title");

    if (pageTitle) pageTitle.textContent = title;

    if (!Array.isArray(data)) {
      statusEl.textContent = "Data must be an array.";
      return;
    }
    let keys;
    if (columnOrder && columnOrder.length) {
      keys = columnOrder.slice();
    } else {
      keys = collectKeys(data);
    }
    if (keys.length === 0) {
      statusEl.textContent = "No columns found.";
      return;
    }

    let keysForSearch = keys;
    if (
      Array.isArray(tableOptions.searchKeys) &&
      tableOptions.searchKeys.length > 0
    ) {
      keysForSearch = tableOptions.searchKeys;
    }
    const searchFold = tableOptions.searchFold !== false;

    let rows = data;
    if (skipBlankRows) {
      rows = rows.filter(r => !isRowBlank(r, keys));
    }
    rawRows = rows;
    const resolveCellBg = makeCellBgResolver(tableOptions, rawRows);
    const getRowDetailId =
      typeof tableOptions.detailRowId === "function"
        ? tableOptions.detailRowId
        : bossDetailRowId;

    function paintStatus(visibleCount) {
      if (!statusEl) return;
      statusEl.textContent = "";
      statusEl.className = "table-status";
      const q = (searchInput && searchInput.value) || "";
      const hasFilter = q.trim().length > 0;
      const vi = statusLocale === "vi";
      const emptySeason = vi ? "(Không có tên mùa)" : "(no season name)";

      const rowMain = document.createElement("div");
      rowMain.className = "table-status__row table-status__row--main";

      const total = document.createElement("span");
      total.className = "table-status__total";
      const totalStrong = document.createElement("strong");
      totalStrong.className = "table-status__total-num";
      totalStrong.textContent = String(rawRows.length);
      total.appendChild(document.createTextNode(vi ? "Tổng " : "Total "));
      total.appendChild(totalStrong);
      total.appendChild(document.createTextNode(vi ? " dòng" : " rows"));
      rowMain.appendChild(total);

      if (showSeasonStats && keys.indexOf(seasonKey) !== -1) {
        const sep = document.createElement("span");
        sep.className = "table-status__sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "·";
        rowMain.appendChild(sep);

        const intro = document.createElement("span");
        intro.className = "table-status__season-intro";
        intro.textContent = vi ? "Theo mùa" : "By season";

        const chips = document.createElement("span");
        chips.className = "table-status__chips";
        chips.setAttribute("role", "list");

        const summary = summaryBySeason(rawRows, seasonKey, emptySeason);
        const names = Object.keys(summary).sort(function (a, b) {
          if (seasonSummaryOrder && seasonSummaryOrder.length) {
            const ia = seasonSummaryOrder.indexOf(a);
            const ib = seasonSummaryOrder.indexOf(b);
            const after = seasonSummaryOrder.length;
            const ra = ia === -1 ? after : ia;
            const rb = ib === -1 ? after : ib;
            if (ra !== rb) return ra - rb;
          }
          return a.localeCompare(b, vi ? "vi" : "en");
        });
        names.forEach(function (name) {
          const chip = document.createElement("span");
          chip.className = "table-status__chip";
          chip.setAttribute("role", "listitem");
          const nameEl = document.createElement("span");
          nameEl.className = "table-status__chip-name";
          let chipLabel = name;
          if (seasonChipPrefix && name !== emptySeason) {
            chipLabel = seasonChipPrefix + " " + name;
          }
          nameEl.textContent = chipLabel;
          const numEl = document.createElement("span");
          numEl.className = "table-status__chip-num";
          numEl.textContent = String(summary[name]?.count || 0);
          numEl.style.letterSpacing = "0.075em";
          const pointEl = document.createElement("span");
          pointEl.className = "table-status__chip-num";
          pointEl.textContent = String(summary[name]?.point || 0);
          pointEl.style.color = "red";
          pointEl.style.letterSpacing = "0.075em";
          const avgEl = document.createElement("span");
          avgEl.className = "table-status__chip-num";
          avgEl.textContent = String(
            Math.round(summary[name]?.point / summary[name]?.count || 0),
          );
          avgEl.style.color = "purple";
          avgEl.style.letterSpacing = "0.075em";
          chip.appendChild(nameEl);
          chip.appendChild(numEl);
          if (cellBgMode === "ac-mong") {
            chip.appendChild(pointEl);
            chip.appendChild(avgEl);
          }
          chips.appendChild(chip);
        });

        rowMain.appendChild(intro);
        rowMain.appendChild(chips);
      }

      if (!vi) {
        const sep2 = document.createElement("span");
        sep2.className = "table-status__sep";
        sep2.setAttribute("aria-hidden", "true");
        sep2.textContent = "·";
        rowMain.appendChild(sep2);
        const hint = document.createElement("span");
        hint.className = "table-status__hint";
        hint.textContent = "Click column headers to sort";
        rowMain.appendChild(hint);
      }

      statusEl.appendChild(rowMain);

      if (hasFilter) {
        const rowFilter = document.createElement("div");
        rowFilter.className = "table-status__row table-status__row--filter";
        const em = document.createElement("em");
        em.className = "table-status__filter";
        em.textContent = vi
          ? "Đang hiển thị: " + visibleCount + " dòng"
          : "Showing: " + visibleCount + " rows";
        rowFilter.appendChild(em);
        statusEl.appendChild(rowFilter);
      }
    }

    refresh(
      tableWrap,
      keys,
      searchInput,
      columnWidths,
      tableExtraClass,
      columnDisplay,
      detailBaseUrl,
      keysForSearch,
      searchFold,
      paintStatus,
      resolveCellBg,
      getRowDetailId,
      cellBgMode,
    );

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        refresh(
          tableWrap,
          keys,
          searchInput,
          columnWidths,
          tableExtraClass,
          columnDisplay,
          detailBaseUrl,
          keysForSearch,
          searchFold,
          paintStatus,
          resolveCellBg,
          getRowDetailId,
          cellBgMode,
        );
      });
    }

    tableWrap.addEventListener("click", e => {
      const th = e.target.closest("th[data-sort-key]");
      if (!th) return;
      const key = th.dataset.sortKey;
      if (sortState.key === key) {
        if (sortState.dir === 1) {
          sortState.dir = -1;
        } else {
          sortState.key = null;
          sortState.dir = 1;
        }
      } else {
        sortState.key = key;
        sortState.dir = 1;
      }
      refresh(
        tableWrap,
        keys,
        searchInput,
        columnWidths,
        tableExtraClass,
        columnDisplay,
        detailBaseUrl,
        keysForSearch,
        searchFold,
        paintStatus,
        resolveCellBg,
        getRowDetailId,
        cellBgMode,
      );
      window.localStorage.setItem(
        STORAGE_KEY_SORT_STATE,
        JSON.stringify(sortState),
      );
    });
  }

  /**
   * options.title — page heading
   * options.data — row array (bắt buộc; vd. window.AC_MONG_10_TABLE_DATA — không dùng chung BOSS_TABLE_DATA)
   * options.columns — optional ordered list of property names to show (subset / order)
   * options.columnWidths — optional map header key → CSS width (e.g. "32ch") for Excel-like layout
   * options.tableExtraClass — extra class on <table> (e.g. Excel styling)
   * options.skipBlankRows — drop rows where all visible cells are empty
   * options.seasonKey — column used for per-season counts (default "Tên season")
   * options.showSeasonStats — set false to hide per-season breakdown
   * options.statusLocale — "vi" | "en" (default "en") for summary line wording
   * options.columnDisplay — map column key → { type: "date"|"images" } | { preWrap: true } | { noWrap: true } | { bossExcel: true }
   * options.detailPage — base URL for row detail (e.g. "ac-mong-detail.html"); links use ?id=<slug> from BOSS_TABLE_DETAIL_ROW_ID(row)
   * options.searchKeys — column keys to include in search (default: all visible columns). Use with searchFold.
   * options.searchFold — if not false, search is diacritic-insensitive (Vietnamese); default true
   * options.seasonChipPrefix — e.g. "Mùa" → chips show "Mùa 1: 6" instead of "1: 6"
   * options.cellBgMode — "ac-mong" | "luyen-nguc" | "phu-ban" — tô màu ô theo dữ liệu (không dùng __cellBg trong .js)
   * options.acMongRowsForSeasonColor — (luyen-nguc) mảng dòng Ác mộng để map màu season theo số đầu trong Index; mặc định BOSS_TABLE_AC_MONG_ROWS hoặc AC_MONG_10_TABLE_DATA
   * options.detailRowId — hàm (row) => id cho ?id=; mặc định BOSS + Index (Ác mộng / Luyện ngục). Phụ bản: BOSS_TABLE_PHU_BAN_DETAIL_ROW_ID
   */
  window.initBossTable = function (options) {
    options = options || {};
    const title = options.title || "";
    const data = options.data;
    if (data === undefined || data === null) {
      const statusEl = document.getElementById("status");
      if (statusEl) {
        statusEl.textContent =
          "Missing table data: pass options.data (e.g. window.AC_MONG_10_TABLE_DATA).";
      }
      return;
    }
    runTable(data, title, options);
  };

  window.BOSS_TABLE_PREPARE = function (data, options) {
    options = options || {};
    if (!Array.isArray(data)) return { keys: [], rows: [] };
    let keys;
    const columnOrder = options.columns;
    if (columnOrder && columnOrder.length) {
      keys = columnOrder.slice();
    } else {
      keys = collectKeys(data);
    }
    let rows = data.slice();
    if (options.skipBlankRows) {
      rows = rows.filter(r => !isRowBlank(r, keys));
    }
    return { keys: keys, rows: rows };
  };

  window.BOSS_TABLE_FORMAT_DATE = formatDateDDMMYYYY;
  window.BOSS_TABLE_FORMAT_TUAN_TIEU_DIET = formatTuanTieuDietTwoLines;
  window.BOSS_TABLE_DETAIL_ROW_ID = bossDetailRowId;
  window.BOSS_TABLE_PHU_BAN_DETAIL_ROW_ID = phuBanDetailRowId;

  /**
   * Màu nền Tên season / Độ khó cho ac-mong-detail.html — khớp bảng Ác mộng (cellBgMode "ac-mong").
   * @param {object} row — dòng đang xem
   * @param {object[]} allRows — toàn bộ dòng (thứ tự như bảng, dùng map màu theo tên season)
   */
  window.BOSS_TABLE_AC_MONG_DETAIL_FIELD_BG = function (row, allRows) {
    const seasonKey = "Tên season";
    const seasonMap = buildSeasonBgMap(allRows, seasonKey);
    const sn = String(row[seasonKey] ?? "").trim();
    let seasonBg = seasonMap[sn];
    if (!seasonBg) {
      seasonBg = SEASON_BG_PALETTE[hashString(sn) % SEASON_BG_PALETTE.length];
    }
    return {
      season: seasonBg,
      difficultyTier: difficultyColumnBgAcMong(row["Độ khó"]),
    };
  };

  window.BOSS_TABLE_DIFFICULTY_TIER_BG = difficultyColumnBgAcMong;
  window.BOSS_TABLE_BOSS_CHIP_BORDER_FOR_BG = bossChipBorderForBackground;

  if (!window.__BOSS_TABLE_DETAIL_NAV__) {
    window.__BOSS_TABLE_DETAIL_NAV__ = true;
    document.addEventListener("click", function (e) {
      const tr = e.target.closest("tbody tr.data-table__row--detail");
      if (!tr) return;
      const table = tr.closest("table[data-detail-base]");
      if (!table) return;
      const base = table.dataset.detailBase;
      const id = tr.dataset.rowDetailId;
      if (!base || !id) return;
      const sep = base.indexOf("?") >= 0 ? "&" : "?";
      const url = base + sep + "id=" + encodeURIComponent(id);
      if (e.ctrlKey || e.metaKey) {
        window.open(url, "_blank");
        e.preventDefault();
        return;
      }
      location.href = url;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const tr = e.target.closest("tbody tr.data-table__row--detail");
      if (!tr || tr !== document.activeElement) return;
      const table = tr.closest("table[data-detail-base]");
      if (!table) return;
      const base = table.dataset.detailBase;
      const id = tr.dataset.rowDetailId;
      if (!base || !id) return;
      e.preventDefault();
      const sep = base.indexOf("?") >= 0 ? "&" : "?";
      location.href = base + sep + "id=" + encodeURIComponent(id);
    });
  }

  /**
   * Video .mp4/.webm đường dẫn tương đối: mở bằng file:// giữ nguyên; http(s) (GitHub Pages, v.v.)
   * gắn prefix raw media trên nhánh main để trình duyệt tải được file trong repo.
   */
  window.BOSS_TABLE_REPO_MEDIA_VIDEO_BASE =
    "https://media.githubusercontent.com/media/quocvan1311/tru-tien-the-gioi/refs/heads/main/";
  window.resolveRepoMediaVideoSrc = function (src) {
    const s = String(src == null ? "" : src).trim();
    if (!s) return s;
    if (/^https?:\/\//i.test(s)) return s;
    try {
      if (typeof location !== "undefined" && location.protocol === "file:") {
        return s;
      }
    } catch (e) {}
    const base = String(window.BOSS_TABLE_REPO_MEDIA_VIDEO_BASE || "").replace(
      /\/?$/,
      "/",
    );
    return base + s.replace(/^\//, "");
  };
  window.parseTuanTieuDietWeek = parseTuanTieuDietWeek;
  window.TUAN_TIEU_DIET_RE = TUAN_TIEU_DIET_RE;
  window.WEEK_BG_PALETTE = WEEK_BG_PALETTE;
})();
