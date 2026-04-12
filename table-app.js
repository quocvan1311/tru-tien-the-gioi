(function () {
  "use strict";

  let rawRows = [];
  let sortState = { key: null, dir: 1 };

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) Object.assign(node, props);
    if (children) children.forEach((c) => node.appendChild(c));
    return node;
  }

  function cellText(v) {
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) return v.join("\n");
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
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
    "1": "#93eaff",
    "2": "#d6c1ff",
    "3": "#ffff99",
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

  /** Độ khó — Ác mộng 10 (Excel): ≥1000 / ≥500 / <500 */
  function difficultyColumnBgAcMong(v) {
    const n = parseDifficultyNumber(v);
    if (n == null) return "#ffffff";
    if (n >= 1000) return "#ff7c80";
    if (n >= 500) return "#ffff99";
    return "#ccffcc";
  }

  /** Viền chip cùng tông với nền, đậm hơn một chút (không dùng xám trung tính cố định). */
  function bossChipBorderForBackground(bg) {
    const s = String(bg ?? "").trim();
    let r;
    let g;
    let b;
    const hex = s.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) {
        h = h
          .split("")
          .map(function (c) {
            return c + c;
          })
          .join("");
      }
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    } else {
      const m = s.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (m) {
        r = +m[1];
        g = +m[2];
        b = +m[3];
      } else {
        return s;
      }
    }
    const t = 0.72;
    return (
      "rgb(" +
      Math.max(0, Math.min(255, Math.round(r * t))) +
      "," +
      Math.max(0, Math.min(255, Math.round(g * t))) +
      "," +
      Math.max(0, Math.min(255, Math.round(b * t))) +
      ")"
    );
  }

  function isTuanTieuDietMissing(row) {
    const v = row["Tuần tiêu diệt"];
    if (v == null) return true;
    return String(v).trim() === "";
  }

  /** Chưa có ngày tiêu diệt — bảng listing không hiển thị chip Độ khô */
  function isNgayTieuDietEmpty(row) {
    const v = row["Ngày tiêu diệt"];
    if (v == null) return true;
    return String(v).trim() === "";
  }

  function isDoKhoValueEmpty(raw) {
    return parseDifficultyNumber(raw) == null;
  }

  function makeAcMongNgucCellBgResolver(
    rows,
    seasonKey,
    useTierDifficultyBg,
    acMongRowsForIndexSeason
  ) {
    const seasonMap = buildSeasonBgMap(rows, seasonKey);
    const indexToSeasonBg = buildAcMongSeasonBgByIndexFirstNum(
      acMongRowsForIndexSeason,
      seasonKey
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
        seasonBg =
          SEASON_BG_PALETTE[hashString(sn) % SEASON_BG_PALETTE.length];
      }
      const w = parseTuanTieuDietWeek(row["Tuần tiêu diệt"]);
      const weekBg =
        w != null && w >= 1
          ? WEEK_BG_PALETTE[(w - 1) % WEEK_BG_PALETTE.length]
          : "#eeeeee";
      if (colKey === "Ghi chú") return "#ffffff";
      /* Ác mộng 10: chưa nhập Tuần tiêu diệt → các ô ngày/tuần/số ngày trắng (chip Độ khó do renderTable) */
      if (useTierDifficultyBg && isTuanTieuDietMissing(row)) {
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
      if (colKey === "Độ khó") {
        return "#ffffff";
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
        true
      );
    }
    if (mode === "luyen-nguc") {
      const acRef =
        tableOptions.acMongRowsForSeasonColor !== undefined
          ? tableOptions.acMongRowsForSeasonColor
          : window.BOSS_TABLE_AC_MONG_ROWS;
      return makeAcMongNgucCellBgResolver(
        rows,
        tableOptions.seasonKey || "Tên season",
        false,
        acRef
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
    rows.forEach((row) => {
      Object.keys(row).forEach((k) => set.add(k));
    });
    return Array.from(set);
  }

  function isRowBlank(row, keys) {
    return keys.every((k) => !cellText(rowValueForColumn(row, k)).trim());
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
    const no = String(row["No."] ?? "")
      .replace(/[^\d]/g, "") || "0";
    const mua = String(row["Mùa"] ?? "")
      .replace(/[^\d]/g, "") || "0";
    return "phu-ban-" + no + "-" + mua + "-" + (pb || "map");
  }

  function countBySeason(rows, seasonKey, emptyLabel) {
    const fallback = emptyLabel || "(no season name)";
    const m = Object.create(null);
    rows.forEach((r) => {
      const label = cellText(r[seasonKey]).trim() || fallback;
      m[label] = (m[label] || 0) + 1;
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
    return rows.filter((row) => {
      const kList = keysToUse || Object.keys(row);
      return kList.some((k) => {
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
    cellBgMode
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
      keys.forEach((k) => {
        const col = document.createElement("col");
        const w = columnWidths[k];
        if (w) col.style.width = w;
        cg.appendChild(col);
      });
      table.appendChild(cg);
    }
    const thead = el("thead");
    const trh = el("tr");
    keys.forEach((k) => {
      const th = el("th", { textContent: k, title: "Sort" });
      th.dataset.sortKey = k;
      th.dataset.col = k;
      if (sortState.key === k) {
        th.classList.add(sortState.dir === 1 ? "sort-asc" : "sort-desc");
      }
      trh.appendChild(th);
    });
    thead.appendChild(trh);

    const tbody = el("tbody");
    rows.forEach((row) => {
      const tr = el("tr");
      if (detailBaseUrl) {
        tr.classList.add("data-table__row--detail");
        tr.dataset.rowDetailId = getRowDetailId(row);
        tr.setAttribute("tabindex", "0");
        tr.setAttribute("role", "link");
      }
      keys.forEach((k) => {
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
            wrap.appendChild(img);
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
              fig.appendChild(img);
            });
            td.appendChild(fig);
          }
        } else if (
          k === "Độ khó" &&
          (cellBgMode === "ac-mong" || cellBgMode === "luyen-nguc")
        ) {
          /* Có ngày tiêu diệt + có độ khó mới hiển thị chip; không thì ô trống */
          if (isNgayTieuDietEmpty(row) || isDoKhoValueEmpty(raw)) {
            td.textContent = "";
          } else {
            const chip = document.createElement("span");
            chip.className = "boss-data-chip boss-data-chip--difficulty";
            chip.textContent = text;
            const tierBg = difficultyColumnBgAcMong(raw);
            chip.style.backgroundColor = tierBg;
            chip.style.borderColor = bossChipBorderForBackground(tierBg);
            td.appendChild(chip);
          }
          if (spec && spec.noWrap) td.style.whiteSpace = "nowrap";
        } else {
          td.textContent = text;
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
    cellBgMode
  ) {
    let rows = filterRows(
      rawRows,
      searchInput ? searchInput.value : "",
      keysForSearch,
      searchFold
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
      cellBgMode
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
    if (Array.isArray(tableOptions.searchKeys) && tableOptions.searchKeys.length > 0) {
      keysForSearch = tableOptions.searchKeys;
    }
    const searchFold = tableOptions.searchFold !== false;

    let rows = data;
    if (skipBlankRows) {
      rows = rows.filter((r) => !isRowBlank(r, keys));
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

        const counts = countBySeason(rawRows, seasonKey, emptySeason);
        const names = Object.keys(counts).sort(function (a, b) {
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
          numEl.textContent = String(counts[name]);
          chip.appendChild(nameEl);
          chip.appendChild(numEl);
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
      cellBgMode
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
          cellBgMode
        );
      });
    }

    tableWrap.addEventListener("click", (e) => {
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
        cellBgMode
      );
    });
  }

  /**
   * options.title — page heading
   * options.data — row array (optional if a prior script set window.BOSS_TABLE_DATA)
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
   * options.acMongRowsForSeasonColor — (luyen-nguc) mảng dòng Ác mộng để map màu season theo số đầu trong Index; mặc định window.BOSS_TABLE_AC_MONG_ROWS
   * options.detailRowId — hàm (row) => id cho ?id=; mặc định BOSS + Index (Ác mộng / Luyện ngục). Phụ bản: BOSS_TABLE_PHU_BAN_DETAIL_ROW_ID
   */
  window.initBossTable = function (options) {
    options = options || {};
    const title = options.title || "";
    const data = options.data !== undefined ? options.data : window.BOSS_TABLE_DATA;
    if (data === undefined) {
      const statusEl = document.getElementById("status");
      if (statusEl) {
        statusEl.textContent = "Missing data: load the sheet .js file before table-app.js.";
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
      rows = rows.filter((r) => !isRowBlank(r, keys));
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
      seasonBg =
        SEASON_BG_PALETTE[hashString(sn) % SEASON_BG_PALETTE.length];
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
})();
