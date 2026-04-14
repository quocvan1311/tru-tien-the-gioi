/**
 * Trang chủ: avatar BOSS — dải #home-boss-strip: 3 section = 3 mùa (cột Tên season trong Ác mộng 10);
 * cụm mỗi mùa: mỗi boss = bundle 1/2/3/4/many như strip; các boss xếp hàng (~√n ô);
 * góc trang: gom theo Độ khó + viền diff-t*; mỗi ảnh một lần;
 * cần ac-mong-10.js (AC_MONG_10_TABLE_DATA).
 */
(function () {
  "use strict";

  function encPath(rel) {
    return rel.split("/").map(encodeURIComponent).join("/");
  }

  /** Khoảng cách từ điểm đến biên hình chữ nhật (0 nếu điểm nằm trong). */
  function distPointToRect(px, py, rect) {
    var cx = Math.min(Math.max(px, rect.left), rect.right);
    var cy = Math.min(Math.max(py, rect.top), rect.bottom);
    var dx = px - cx;
    var dy = py - cy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Ảnh bị translate (--repel-*) làm lệch vị trí vẽ so với vùng hit layout;
   * dùng elementsFromPoint + fallback “gần nhất trong slop” để hover sang lân cận vẫn ổn.
   */
  function findRepelHoverTarget(
    root,
    clientX,
    clientY,
    bundles,
    standaloneImgs,
    slop,
  ) {
    if (!root) return null;
    /* Repel có thể >150px với lân cận rất gần — slop nhỏ sẽ clear giữa chừng khi rê sang ảnh kế. */
    slop = slop != null ? slop : 220;
    var list = document.elementsFromPoint(clientX, clientY);
    var i;
    var el;
    for (i = 0; i < list.length; i++) {
      el = list[i];
      if (!root.contains(el)) continue;
      if (el.classList && el.classList.contains("home-boss-bundle")) {
        return el;
      }
      if (el.classList && el.classList.contains("home-boss-stack__img")) {
        if (!el.closest(".home-boss-bundle")) {
          return el;
        }
      }
    }
    var best = null;
    var bestD = Infinity;
    Array.prototype.forEach.call(bundles, function (b) {
      var rect = b.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      var d = distPointToRect(clientX, clientY, rect);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    });
    var j;
    for (j = 0; j < standaloneImgs.length; j++) {
      var img = standaloneImgs[j];
      var ir = img.getBoundingClientRect();
      if (ir.width < 1 || ir.height < 1) continue;
      var d2 = distPointToRect(clientX, clientY, ir);
      if (d2 < bestD) {
        bestD = d2;
        best = img;
      }
    }
    if (best && bestD <= slop) {
      return best;
    }
    return null;
  }

  /**
   * Dải strip: khi phóng to chồng nhau, elementsFromPoint trúng layer trên trước —
   * chọn bundle có cạnh gần pointer nhất, hòa thì gần tâm hơn (dễ rê sang lân cận).
   */
  function pickNearestBundleAtPoint(bundles, clientX, clientY, slop) {
    slop = slop != null ? slop : 360;
    var candidates = [];
    Array.prototype.forEach.call(bundles, function (b) {
      var imgs = b.querySelectorAll(".home-boss-stack__img");
      var r = unionRectFromImgList(imgs);
      if (!r || r.right - r.left < 1) {
        r = b.getBoundingClientRect();
      }
      var rw = r.right - r.left;
      var rh = r.bottom - r.top;
      if (rw < 1 || rh < 1) return;
      var dEdge = distPointToRect(clientX, clientY, r);
      if (dEdge > slop) return;
      var cx = r.left + r.width * 0.5;
      var cy = r.top + r.height * 0.5;
      var dCtr = Math.sqrt(
        Math.pow(clientX - cx, 2) + Math.pow(clientY - cy, 2),
      );
      candidates.push({ b: b, dEdge: dEdge, dCtr: dCtr });
    });
    if (!candidates.length) return null;
    candidates.sort(function (a, b) {
      if (a.dEdge !== b.dEdge) return a.dEdge - b.dEdge;
      return a.dCtr - b.dCtr;
    });
    return candidates[0].b;
  }

  function buildPathToDetailId(rows, idFn) {
    var map = Object.create(null);
    if (!Array.isArray(rows) || typeof idFn !== "function") return map;
    rows.forEach(function (row) {
      var id = idFn(row);
      var imgs = row.__images;
      if (!Array.isArray(imgs)) return;
      imgs.forEach(function (p) {
        var s = p != null ? String(p).trim() : "";
        if (s) map[s] = id;
      });
    });
    return map;
  }

  function isPhuBan10Path(p) {
    return (
      String(p || "")
        .toLowerCase()
        .indexOf("phu ban 10/") !== -1
    );
  }

  function bundleDetailIdForPb10(paths, pathToDetailId) {
    var i;
    var p;
    var id;
    for (i = 0; i < paths.length; i++) {
      p = paths[i];
      if (!isPhuBan10Path(p)) continue;
      id = pathToDetailId[p];
      if (id) return id;
    }
    return "";
  }

  function initHomeAcMongDetailNav() {
    function detailUrl(id) {
      return "ac-mong-detail.html?id=" + encodeURIComponent(id) + "&from=index";
    }
    function go(e, id) {
      if (!id) return;
      e.preventDefault();
      var url = detailUrl(id);
      if (e.ctrlKey || e.metaKey) {
        window.open(url, "_blank");
        return;
      }
      location.href = url;
    }
    document.body.addEventListener("click", function (e) {
      var img = e.target.closest(".home-boss-stack__img[data-ac-detail-id]");
      if (img) {
        go(e, img.getAttribute("data-ac-detail-id"));
        return;
      }
      var b = e.target.closest(".home-boss-bundle[data-ac-detail-id]");
      if (b) {
        go(e, b.getAttribute("data-ac-detail-id"));
      }
    });
    document.body.addEventListener("auxclick", function (e) {
      if (e.button !== 1) return;
      var img = e.target.closest(".home-boss-stack__img[data-ac-detail-id]");
      var el = img || e.target.closest(".home-boss-bundle[data-ac-detail-id]");
      var id = el && el.getAttribute("data-ac-detail-id");
      if (!id) return;
      e.preventDefault();
      window.open(detailUrl(id), "_blank");
    });
    document.body.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var b = e.target.closest(".home-boss-bundle[data-ac-detail-id]");
      if (!b || document.activeElement !== b) return;
      e.preventDefault();
      location.href = detailUrl(b.getAttribute("data-ac-detail-id"));
    });
  }

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function parseDifficulty(v) {
    if (v === null || v === undefined) return null;
    var x = parseFloat(String(v).trim().replace(",", "."));
    return Number.isNaN(x) ? null : x;
  }

  /** Cùng ngưỡng table-app.js — Ác mộng 10 */
  function tierIndex(n) {
    if (n == null) return 3;
    if (n >= 1000) return 0;
    if (n >= 750) return 1;
    if (n >= 500) return 2;
    return 3;
  }

  function uniqueInOrder(arr) {
    var seen = Object.create(null);
    var out = [];
    (arr || []).forEach(function (p) {
      if (!p || seen[p]) return;
      seen[p] = true;
      out.push(p);
    });
    return out;
  }

  /**
   * Mỗi path chỉ một lần; mỗi dòng bảng → một bundle (cùng phụ bản / cùng __images).
   */
  function collectBundlesByTier(rows) {
    var tiers = [[], [], [], []];
    var seenPath = Object.create(null);
    if (!Array.isArray(rows)) return tiers;
    rows.forEach(function (row) {
      var n = parseDifficulty(row["Độ khó"]);
      var ti = tierIndex(n);
      var imgs = row.__images;
      if (!Array.isArray(imgs)) return;
      var paths = [];
      imgs.forEach(function (p) {
        var s = p != null ? String(p).trim() : "";
        if (!s || seenPath[s]) return;
        seenPath[s] = true;
        paths.push(s);
      });
      if (paths.length === 0) return;
      tiers[ti].push({ paths: paths });
    });
    return tiers;
  }

  /** Chỉ giữ chữ số (ASCII + fullwidth Excel). */
  function normalizeIndexDigits(indexVal) {
    var s = String(indexVal == null ? "" : indexVal).trim();
    var out = "";
    var i;
    var c;
    for (i = 0; i < s.length; i++) {
      c = s.charCodeAt(i);
      if (c >= 48 && c <= 57) {
        out += s.charAt(i);
      } else if (c >= 0xff10 && c <= 0xff19) {
        out += String.fromCharCode(c - 0xff10 + 48);
      }
    }
    return out;
  }

  function leadingDigitsFromFilename(path) {
    var base =
      String(path || "")
        .split("/")
        .pop() || "";
    var m = base.match(/^\s*(\d+)/);
    return m ? m[1] : "";
  }

  /** Chuỗi số để đọc mùa: ưu tiên row["Index"], không có thì prefix số tên file ảnh đầu. */
  function digitsStringForStripRow(row) {
    var d = normalizeIndexDigits(row && row["Index"]);
    if (d.length) return d;
    var imgs = row && row.__images;
    if (!Array.isArray(imgs) || !imgs.length) return "";
    return leadingDigitsFromFilename(imgs[0]);
  }

  /**
   * Thứ tự 3 mùa trong bảng Ác mộng 10 (khớp cột "Tên season").
   */
  var AC_MONG_SEASON_STRIP_ORDER = [
    "Đạo Khởi Thanh Vân",
    "Cô Tâm Hám Hải",
    "Thiện Âm Phá Hiểu",
  ];

  /** Cột strip 0…2 theo "Tên season"; không khớp → bỏ qua dòng. */
  function stripBucketIndexFromSeasonName(row) {
    var raw = row && row["Tên season"];
    if (raw == null) return null;
    var name = String(raw).trim();
    if (!name) return null;
    var i = AC_MONG_SEASON_STRIP_ORDER.indexOf(name);
    return i >= 0 ? i : null;
  }

  function sortKeyFromStripRow(row) {
    var d = digitsStringForStripRow(row);
    if (!d.length) return 0;
    var x = parseInt(d, 10);
    return Number.isNaN(x) ? 0 : x;
  }

  /**
   * Mỗi dòng → một bundle; gom vào đúng 1 trong 3 nhóm theo "Tên season"; sort theo Index.
   */
  function collectBundlesBySeasonForStrip(rows) {
    var seasons = [[], [], []];
    var seenPath = Object.create(null);
    if (!Array.isArray(rows)) return seasons;
    rows.forEach(function (row) {
      var imgs = row.__images;
      if (!Array.isArray(imgs)) return;
      var col = stripBucketIndexFromSeasonName(row);
      if (col == null) return;
      var paths = [];
      imgs.forEach(function (p) {
        var s = p != null ? String(p).trim() : "";
        if (!s || seenPath[s]) return;
        seenPath[s] = true;
        paths.push(s);
      });
      if (!paths.length) return;
      seasons[col].push({
        paths: paths,
        sortKey: sortKeyFromStripRow(row),
        diffTier: tierIndex(parseDifficulty(row["Độ khó"])),
      });
    });
    seasons.forEach(function (list) {
      list.sort(function (a, b) {
        return a.sortKey - b.sortKey;
      });
    });
    return seasons;
  }

  function tiersFlatFromBundles(bundleTiers) {
    return bundleTiers.map(function (tier) {
      var flat = [];
      tier.forEach(function (b) {
        b.paths.forEach(function (p) {
          flat.push(p);
        });
      });
      return flat;
    });
  }

  function bundleLayoutModifier(n) {
    var k = Math.floor(Number(n));
    if (!Number.isFinite(k) || k < 1) k = 1;
    if (k <= 1) return "1";
    if (k === 2) return "2";
    if (k === 3) return "3";
    if (k === 4) return "4";
    return "many";
  }

  /**
   * Một dòng bảng → một DOM bundle (1 / 2 ngang / 3 tam giác / 4 lưới / nhiều ô).
   * Dùng chung strip --bundles và cụm mùa cluster-wrap.
   */
  function buildBossGroupElement(bundle, pathToDetailId, animStart) {
    pathToDetailId = pathToDetailId || Object.create(null);
    var rels = bundle && bundle.paths;
    if (!Array.isArray(rels) || rels.length === 0) return null;
    var n = rels.length | 0;
    var dt =
      bundle.diffTier != null && bundle.diffTier >= 0 && bundle.diffTier <= 3
        ? bundle.diffTier | 0
        : 3;
    var wrap = document.createElement("div");
    wrap.className =
      "home-boss-bundle home-boss-bundle--" +
      bundleLayoutModifier(n) +
      " home-boss-stack--diff-t" +
      dt;
    wrap.setAttribute("data-bundle-n", String(n));
    wrap.setAttribute("data-boss-diff-tier", String(dt));
    var navBid = bundleDetailIdForPb10(rels, pathToDetailId);
    if (navBid) {
      wrap.setAttribute("data-ac-detail-id", navBid);
      wrap.setAttribute("role", "link");
      wrap.setAttribute("tabindex", "0");
      wrap.setAttribute("aria-label", "Chi tiết BOSS Ác mộng 10");
    }
    if (n === 4) {
      wrap.setAttribute("data-bundle-grid", "2x2");
      wrap.style.setProperty("--bundle-cols", "2");
      wrap.style.setProperty("--bundle-rows", "2");
      wrap.style.setProperty("display", "grid", "important");
      wrap.style.setProperty(
        "grid-template-columns",
        "repeat(2, minmax(0, max-content))",
        "important",
      );
      wrap.style.setProperty(
        "grid-template-rows",
        "repeat(2, minmax(0, max-content))",
        "important",
      );
      wrap.style.setProperty("gap", "0", "important");
      wrap.style.setProperty("justify-content", "center", "important");
      wrap.style.setProperty("align-content", "center", "important");
    } else if (n > 4) {
      var g = clusterGridDims(n);
      g = clusterGridDimsMobile(n, g);
      wrap.style.setProperty("--bundle-cols", String(g.cols));
      wrap.style.setProperty("--bundle-rows", String(g.rows));
      wrap.setAttribute("data-bundle-grid", g.cols + "x" + g.rows);
    }
    var globalIdx = animStart | 0;
    rels.forEach(function (rel) {
      var img = document.createElement("img");
      img.src = encPath(rel);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.className = "home-boss-stack__img";
      img.setAttribute("draggable", "false");
      img.style.animationDelay = (globalIdx * 0.055).toFixed(3) + "s";
      if (isPhuBan10Path(rel) && pathToDetailId[rel]) {
        img.setAttribute("data-ac-detail-id", pathToDetailId[rel]);
      }
      wrap.appendChild(img);
      globalIdx++;
    });
    return { wrap: wrap, nextAnim: globalIdx };
  }

  function availUnused(pool, used) {
    return (pool || []).filter(function (p) {
      return p && !used[p];
    });
  }

  /**
   * Lấy tối đa n path chưa dùng; ưu tiên tierPref, thiếu thì bổ sung từ tier khác.
   * Không lặp path (mỗi ảnh tối đa một lần trên trang).
   */
  function takeUniquePreferTier(tiers, tierPref, n, used) {
    var pref = availUnused(tiers[tierPref], used);
    shuffleInPlace(pref);
    var out = pref.slice(0, Math.min(n, pref.length));
    var k;
    for (k = 0; k < out.length; k++) used[out[k]] = true;
    if (out.length >= n) return out;
    var need = n - out.length;
    var rest = [];
    var t;
    for (t = 0; t < 4; t++) {
      if (t === tierPref) continue;
      availUnused(tiers[t], used).forEach(function (p) {
        if (rest.indexOf(p) === -1) rest.push(p);
      });
    }
    shuffleInPlace(rest);
    var more = rest.slice(0, need);
    for (k = 0; k < more.length; k++) used[more[k]] = true;
    return out.concat(more);
  }

  /**
   * Lưới cụm avatar trong một bundle: khi một hàng quá rộng, tăng số hàng (wrap) — không cố 1 hàng.
   * Ưu tiên khối gần vuông / √n: 2×2, 3×3, chữ nhật đầy (4×3…), kiểu 3+3+2 (8 ảnh), tránh hàng cuối 1 ô.
   */
  function clusterGridDims(n) {
    if (n <= 0) return { cols: 1, rows: 1 };
    if (n === 1) return { cols: 1, rows: 1 };

    var sqrtn = Math.sqrt(n);
    var best = null;
    var bestScore = Infinity;
    var bestTie = Infinity;

    var c;
    for (c = 1; c <= n; c++) {
      var r = Math.ceil(n / c);
      var inLast = n - (r - 1) * c;
      if (inLast <= 0) {
        inLast = c;
      }

      /* Gần (√n, √n): 8 ảnh → 3×3 (3+3+2) thay vì 8×1; 12 → 3×4 / 4×3 */
      var score =
        Math.abs(c - sqrtn) + Math.abs(r - sqrtn) + Math.abs(c - r) * 5;

      if (r > 1 && inLast === 1) {
        score += 200;
      }
      if (r > 2 && inLast === 2) {
        score += 2;
      }
      if (c * r === n) {
        score -= 8;
      }
      if (c === r && c * c === n) {
        score -= 12;
      }
      /* Một hàng/cột quá dài — dễ vượt container; khuyến khích wrap trong cụm */
      if (r === 1 && n > 3) {
        score += 28;
      }
      if (c === 1 && n > 4) {
        score += 22;
      }

      /* Hòa: ưu tiên |c−r| nhỏ, rồi c gần round(√n) (vd 12 ảnh → 3 cột) */
      var tie =
        Math.abs(c - r) * 1000 + Math.abs(c - Math.round(sqrtn)) * 10 + c;
      if (
        !best ||
        score < bestScore ||
        (score === bestScore && tie < bestTie)
      ) {
        bestScore = score;
        bestTie = tie;
        best = { cols: c, rows: r };
      }
    }
    return best;
  }

  /**
   * Màn hẹp: từng ép max 3 cột — dễ tạo hàng cuối 1 ô (4→3+1) hoặc phá lưới 2 hàng (8→3+3+2).
   * Giữ nguyên nếu đã ≤3 cột, hoặc ≤2 hàng (đã cân), hoặc ép 3 cột sẽ để lại 1 ô lẻ.
   */
  function clusterGridDimsMobile(n, g) {
    if (
      typeof window.matchMedia === "undefined" ||
      !window.matchMedia("(max-width: 639px)").matches ||
      g.cols <= 3
    ) {
      return g;
    }
    if (g.rows <= 2) {
      return g;
    }
    var c3 = 3;
    var r3 = Math.ceil(n / c3);
    var last3 = n - (r3 - 1) * c3;
    if (last3 === 1 && n > 3) {
      return g;
    }
    return { cols: c3, rows: r3 };
  }

  function appendStack(parent, className, rels, pathToDetailId) {
    if (!rels || !rels.length) return;
    pathToDetailId = pathToDetailId || Object.create(null);
    var stack = document.createElement("div");
    stack.className = className;
    var isStrip = className.indexOf("--strip") !== -1;
    if (isStrip) {
      stack.classList.add("home-boss-stack--cluster");
      if (rels.length >= 8) {
        stack.classList.add("home-boss-stack--strip-dense");
      }
      var g = clusterGridDims(rels.length);
      g = clusterGridDimsMobile(rels.length, g);
      stack.style.setProperty("--cluster-cols", String(g.cols));
      stack.style.setProperty("--cluster-rows", String(g.rows));
      stack.setAttribute("data-cluster-grid", g.cols + "x" + g.rows);
      stack.setAttribute("data-cluster-cols", String(g.cols));
      if (rels.length === 4) {
        stack.style.setProperty("display", "grid", "important");
        stack.style.setProperty(
          "grid-template-columns",
          "repeat(2, minmax(0, max-content))",
          "important",
        );
        stack.style.setProperty("grid-auto-rows", "auto", "important");
      }
    }
    rels.forEach(function (rel, idx) {
      var img = document.createElement("img");
      img.src = encPath(rel);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.className = "home-boss-stack__img";
      img.setAttribute("draggable", "false");
      if (isPhuBan10Path(rel) && pathToDetailId[rel]) {
        img.setAttribute("data-ac-detail-id", pathToDetailId[rel]);
      }
      if (isStrip) {
        img.style.animationDelay = (idx * 0.055).toFixed(3) + "s";
      }
      stack.appendChild(img);
    });
    parent.appendChild(stack);
  }

  /**
   * Chia n avatar thành các hàng cân (chênh tối đa 1 ô), số hàng ≈ √n — vd 13 → [5,4,4] gần vuông.
   */
  function seasonStripRowPattern(n) {
    if (n <= 0) return [];
    if (n === 1) return [1];
    var r = Math.floor(Math.sqrt(n));
    if (r < 1) r = 1;
    var base = Math.floor(n / r);
    var rem = n % r;
    var pattern = [];
    var i;
    for (i = 0; i < r; i++) {
      pattern.push(base + (i < rem ? 1 : 0));
    }
    return pattern;
  }

  /** Chia n boss vào đúng `rows` hàng, mỗi hàng lệch tối đa 1. */
  function redistributeBossesIntoRows(n, rows) {
    if (rows <= 0 || n <= 0) return [];
    if (rows === 1) return [n];
    if (rows > n) rows = n;
    var base = Math.floor(n / rows);
    var rem = n % rows;
    var pattern = [];
    var i;
    for (i = 0; i < rows; i++) {
      pattern.push(base + (i < rem ? 1 : 0));
    }
    return pattern;
  }

  /** Cùng tổng boss nhưng thêm 1 hàng so với seasonStripRowPattern (vd 13 → 4 hàng [4,3,3,3]). */
  function seasonStripRowPatternOneExtraRow(n) {
    if (n <= 0) return [];
    if (n === 1) return [1];
    var basePat = seasonStripRowPattern(n);
    var rows = basePat.length + 1;
    if (rows > n) rows = n;
    return redistributeBossesIntoRows(n, rows);
  }

  /**
   * Dải theo mùa: mỗi dòng bảng = một boss — layout 1 / 2 ngang / 3 tam giác / 4+ lưới như strip --bundles;
   * các boss xếp hàng theo seasonStripRowPattern (đơn vị = boss, không tách ảnh cùng boss).
   */
  function appendSeasonStripFlexCluster(
    parent,
    className,
    pickedBundles,
    pathToDetailId,
    opts,
  ) {
    if (!pickedBundles || !pickedBundles.length) return;
    opts = opts || {};
    pathToDetailId = pathToDetailId || Object.create(null);
    var stack = document.createElement("div");
    stack.className =
      className + " home-boss-stack--cluster home-boss-stack--cluster-wrap";
    var totalImgs = 0;
    var bi;
    for (bi = 0; bi < pickedBundles.length; bi++) {
      totalImgs += pickedBundles[bi].paths.length;
    }
    if (totalImgs >= 8) {
      stack.classList.add("home-boss-stack--strip-dense");
    }

    var units = [];
    var anim = 0;
    pickedBundles.forEach(function (bundle) {
      var built = buildBossGroupElement(bundle, pathToDetailId, anim);
      if (!built) return;
      anim = built.nextAnim;
      units.push(built.wrap);
    });

    var rowsPattern =
      units.length >= 7
        ? seasonStripRowPatternOneExtraRow(units.length)
        : seasonStripRowPattern(units.length);
    var ui = 0;
    var singleFaceIdx = 0;
    var ri;
    for (ri = 0; ri < rowsPattern.length; ri++) {
      var row = document.createElement("div");
      row.className = "home-boss-season-cluster__row";
      var take = rowsPattern[ri];
      var t;
      for (t = 0; t < take; t++) {
        if (ui >= units.length) break;
        var node = units[ui];
        ui++;
        if (node.classList && node.classList.contains("home-boss-bundle--1")) {
          if (singleFaceIdx % 2 === 1) {
            node.classList.add("home-boss-strip-face-zb");
          }
          if (singleFaceIdx % 3 === 0) {
            node.classList.add("home-boss-strip-face-za");
          }
          singleFaceIdx++;
        }
        row.appendChild(node);
      }
      stack.appendChild(row);
    }
    parent.appendChild(stack);
  }

  /**
   * Dải tier: nhiều bundle (mỗi bundle = một dòng __images); layout 1 / 2 / 3 / 4 / nhiều.
   */
  function appendBundleStrip(parent, className, bundles, pathToDetailId) {
    if (!bundles || !bundles.length) return;
    pathToDetailId = pathToDetailId || Object.create(null);
    var stack = document.createElement("div");
    stack.className =
      className + " home-boss-stack--bundles home-boss-stack--cluster";
    var totalImgs = 0;
    var b;
    for (b = 0; b < bundles.length; b++) {
      totalImgs += bundles[b].paths.length;
    }
    if (totalImgs >= 8) {
      stack.classList.add("home-boss-stack--strip-dense");
    }

    var globalIdx = 0;
    bundles.forEach(function (bundle) {
      var built = buildBossGroupElement(bundle, pathToDetailId, globalIdx);
      if (!built) return;
      globalIdx = built.nextAnim;
      stack.appendChild(built.wrap);
    });
    parent.appendChild(stack);
  }

  function hasAcMongBossData(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return false;
    var i;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r && Array.isArray(r.__images) && r.__images.length > 0) {
        return true;
      }
    }
    return false;
  }

  /** Góc: nhiều avatar hơn; dải strip: tối đa mỗi cụm (4 section theo mùa) */
  var CORNER_AVATAR_COUNT = 6;
  var STRIP_CLUSTER_MAX = 18;
  /** Fallback 2 hàng: vừa viewport, không cần cụm tier quá rộng */
  var FALLBACK_STRIP_ROW_N = 12;

  /**
   * Section = slot mùa (season 1…4); viền/màu theo Độ khó trên từng avatar (diff-t*).
   */

  /**
   * @param bundleTiersForCorners — theo Độ khó (chỉ dùng cho góc + pathTiers)
   * @param seasonStripBuckets — 3 mảng bundle theo "Tên season" (mùa 1…3)
   */
  function buildTieredLayout(
    bundleTiersForCorners,
    seasonStripBuckets,
    pathToDetailId,
  ) {
    var pathTiers = tiersFlatFromBundles(bundleTiersForCorners);
    var deco = document.getElementById("home-boss-deco");
    var strip = document.getElementById("home-boss-strip");
    var used = Object.create(null);

    var CORNERS = [
      { cls: "home-boss-stack home-boss-stack--tl", tier: 0 },
      { cls: "home-boss-stack home-boss-stack--tr", tier: 1 },
      { cls: "home-boss-stack home-boss-stack--ml", tier: 2 },
      { cls: "home-boss-stack home-boss-stack--mr", tier: 3 },
    ];

    if (strip) {
      strip.textContent = "";
      strip.classList.add("home-boss-strip--tiered");

      var SEASON_SLOTS = 3;
      var si;
      for (si = 0; si < SEASON_SLOTS; si++) {
        var idx = si;
        var seasonNum = idx + 1;
        var rawBundles = (seasonStripBuckets[idx] || []).slice();
        var availBundles = rawBundles.filter(function (b) {
          var ok = true;
          b.paths.forEach(function (p) {
            if (used[p]) ok = false;
          });
          return ok && b.paths.length > 0;
        });
        if (!availBundles.length) continue;

        var picked = [];
        var imgCount = 0;
        var bi;
        for (bi = 0; bi < availBundles.length; bi++) {
          var nb = availBundles[bi];
          var next = imgCount + nb.paths.length;
          if (next > STRIP_CLUSTER_MAX) break;
          picked.push(nb);
          imgCount = next;
        }
        if (!picked.length) continue;

        picked.forEach(function (b) {
          b.paths.forEach(function (p) {
            used[p] = true;
          });
        });

        var section = document.createElement("section");
        section.className =
          "home-boss-tier home-boss-tier--season-" + seasonNum;
        section.setAttribute("data-boss-season", String(seasonNum));

        appendSeasonStripFlexCluster(
          section,
          "home-boss-stack home-boss-stack--strip",
          picked,
          pathToDetailId,
        );
        strip.appendChild(section);
      }
    }

    if (deco) {
      CORNERS.forEach(function (cfg) {
        var part = takeUniquePreferTier(
          pathTiers,
          cfg.tier,
          CORNER_AVATAR_COUNT,
          used,
        );
        if (part.length === 0) return;
        appendStack(
          deco,
          cfg.cls + " home-boss-stack--diff-t" + cfg.tier,
          part,
          pathToDetailId,
        );
      });
    }
  }

  function escapeDetailIdAttr(id) {
    return typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(id)
      : String(id).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  /** Bbox bao tất cả bundle cùng boss (cùng data-ac-detail-id) trong strip — dùng cho vùng hover + repel. */
  function unionRectOfSameBossBundles(strip, detailId) {
    if (!detailId) return null;
    var esc = escapeDetailIdAttr(detailId);
    var sel =
      '.home-boss-stack--cluster-wrap .home-boss-bundle[data-ac-detail-id="' +
      esc +
      '"]';
    var list = strip.querySelectorAll(sel);
    var r = null;
    Array.prototype.forEach.call(list, function (b) {
      var br = b.getBoundingClientRect();
      if (br.width < 1 || br.height < 1) return;
      if (!r) {
        r = { left: br.left, right: br.right, top: br.top, bottom: br.bottom };
      } else {
        r.left = Math.min(r.left, br.left);
        r.right = Math.max(r.right, br.right);
        r.top = Math.min(r.top, br.top);
        r.bottom = Math.max(r.bottom, br.bottom);
      }
    });
    return r;
  }

  function unionRectFromImgList(imgList) {
    var r = null;
    var i;
    var br;
    for (i = 0; i < imgList.length; i++) {
      br = imgList[i].getBoundingClientRect();
      if (br.width < 1 || br.height < 1) continue;
      if (!r) {
        r = { left: br.left, right: br.right, top: br.top, bottom: br.bottom };
      } else {
        r.left = Math.min(r.left, br.left);
        r.right = Math.max(r.right, br.right);
        r.top = Math.min(r.top, br.top);
        r.bottom = Math.max(r.bottom, br.bottom);
      }
    }
    return r;
  }

  /**
   * Đẩy dọc từ tâm cụm hover → tâm cụm lân cận. Độ lớn tối thiểu phụ thuộc bbox hover (đã gồm scale CSS)
   * Mặc định avatar chụm (CSS overlap); khi hover đẩy thêm để tách khỏi vùng phóng (scale ~1.68).
   */
  function radialRepelFromCenters(hoverRect, neighborRect, pushMinPx) {
    /* Đồng bộ .cluster-wrap .home-boss-bundle:hover scale trong ac-mong-10.css */
    var HOVER_SCALE = 1.68;
    var marginPx = 20;
    var pushCap = 118;
    var hw = hoverRect.right - hoverRect.left;
    var hh = hoverRect.bottom - hoverRect.top;
    var hoverMax = Math.max(hw, hh);
    var extraFromScale =
      ((hoverMax * (HOVER_SCALE - 1)) / (2 * HOVER_SCALE)) * 0.9;
    var neighW = neighborRect.right - neighborRect.left;
    var neighH = neighborRect.bottom - neighborRect.top;
    var neighMax = Math.max(neighW, neighH);
    /* Bù overlap ngang ~10% giữa hai boss (ac-mong-10.css bundle margin-left -0.1) */
    var interBossOverlapPayback = Math.max(neighMax, hoverMax) * 0.1;
    var push =
      extraFromScale + marginPx + neighMax * 0.065 + interBossOverlapPayback;
    push = Math.max(pushMinPx || 0, push);

    var hcx = (hoverRect.left + hoverRect.right) * 0.5;
    var hcy = (hoverRect.top + hoverRect.bottom) * 0.5;
    var ncx = (neighborRect.left + neighborRect.right) * 0.5;
    var ncy = (neighborRect.top + neighborRect.bottom) * 0.5;
    var dx = ncx - hcx;
    var dy = ncy - hcy;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) {
      dx = 1;
      dy = 0;
      len = 1;
    }
    /* Giảm dần mượt theo khoảng cách tâm — xa thì không đẩy nặng; trần pushCap tránh bay quá xa */
    var centerDist = len;
    var distMul = 0.24 + 0.76 * (105 / (105 + centerDist));
    push *= distMul;
    if (push > pushCap) push = pushCap;

    return {
      x: (dx / len) * push,
      y: (dy / len) * push,
    };
  }

  /**
   * Dải tier (3 mùa): hover bundle — đẩy cụm lân cận ra xa tâm cụm đang hover; cùng data-ac-detail-id
   * = một cụm (cùng vector). Reset repel trước mỗi lần đo.
   */
  function initTieredStripUnifiedRepel(strip, radialPushPx) {
    radialPushPx = radialPushPx != null ? radialPushPx : 18;
    var clusterStacks = strip.querySelectorAll(".home-boss-stack--cluster");
    var imgs = strip.querySelectorAll(".home-boss-stack__img");
    if (!imgs.length) return;

    var bundles = strip.querySelectorAll(".home-boss-bundle");
    var standaloneImgs = [];
    Array.prototype.forEach.call(imgs, function (img) {
      if (!img.closest(".home-boss-bundle")) {
        standaloneImgs.push(img);
      }
    });

    var lastRepelTarget = null;
    var lastHoverBossKey = null;

    function clearRepel() {
      lastRepelTarget = null;
      lastHoverBossKey = null;
      Array.prototype.forEach.call(clusterStacks, function (s) {
        s.classList.remove("home-boss-stack--repel-active");
      });
      Array.prototype.forEach.call(bundles, function (b) {
        b.style.removeProperty("--repel-x");
        b.style.removeProperty("--repel-y");
      });
      Array.prototype.forEach.call(imgs, function (img) {
        img.style.removeProperty("--repel-x");
        img.style.removeProperty("--repel-y");
      });
    }

    function applyRepel(hovered) {
      Array.prototype.forEach.call(bundles, function (b) {
        b.style.removeProperty("--repel-x");
        b.style.removeProperty("--repel-y");
      });
      Array.prototype.forEach.call(imgs, function (img) {
        img.style.removeProperty("--repel-x");
        img.style.removeProperty("--repel-y");
      });
      void strip.offsetHeight;

      var hoveredIsBundle =
        hovered.classList && hovered.classList.contains("home-boss-bundle");
      var hoverDetailId =
        hovered.getAttribute && hovered.getAttribute("data-ac-detail-id");

      var hr = null;
      if (hoveredIsBundle && hoverDetailId) {
        hr = unionRectOfSameBossBundles(strip, hoverDetailId);
      }
      if (!hr || hr.right - hr.left < 1 || hr.bottom - hr.top < 1) {
        hr = hovered.getBoundingClientRect();
      }
      if (hr.right - hr.left < 1 || hr.bottom - hr.top < 1) return;

      Array.prototype.forEach.call(clusterStacks, function (s) {
        s.classList.add("home-boss-stack--repel-active");
      });

      var groupKeys = [];
      var imgsByBoss = Object.create(null);
      Array.prototype.forEach.call(imgs, function (img, idx) {
        var id = img.getAttribute("data-ac-detail-id");
        var gk = id ? String(id) : "_solo_" + idx;
        if (!imgsByBoss[gk]) {
          imgsByBoss[gk] = [];
          groupKeys.push(gk);
        }
        imgsByBoss[gk].push(img);
      });

      var gi;
      var gk;
      var list;
      var unionIr;
      var out;
      var j;
      var img;

      for (gi = 0; gi < groupKeys.length; gi++) {
        gk = groupKeys[gi];
        list = imgsByBoss[gk];
        if (hoveredIsBundle) {
          if (hoverDetailId && gk === String(hoverDetailId)) {
            continue;
          }
          var insideH = false;
          for (j = 0; j < list.length; j++) {
            if (hovered.contains(list[j])) {
              insideH = true;
              break;
            }
          }
          if (insideH) {
            continue;
          }
        } else if (list.indexOf(hovered) !== -1) {
          continue;
        }

        unionIr = unionRectFromImgList(list);
        if (!unionIr) continue;

        out = radialRepelFromCenters(hr, unionIr, radialPushPx);
        var repelSeen = Object.create(null);
        for (j = 0; j < list.length; j++) {
          img = list[j];
          var bundleEl = img.closest && img.closest(".home-boss-bundle");
          if (!bundleEl) {
            img.style.setProperty("--repel-x", out.x.toFixed(2) + "px");
            img.style.setProperty("--repel-y", out.y.toFixed(2) + "px");
            continue;
          }
          var bid =
            bundleEl.getAttribute("data-ac-detail-id") ||
            "_b_" + Array.prototype.indexOf.call(bundles, bundleEl);
          if (repelSeen[bid]) continue;
          repelSeen[bid] = true;
          bundleEl.style.setProperty("--repel-x", out.x.toFixed(2) + "px");
          bundleEl.style.setProperty("--repel-y", out.y.toFixed(2) + "px");
        }
      }
    }

    function onPointerMove(e) {
      var br = strip.getBoundingClientRect();
      var x = e.clientX;
      var y = e.clientY;
      if (x < br.left || x > br.right || y < br.top || y > br.bottom) {
        if (lastRepelTarget !== null) {
          clearRepel();
        }
        return;
      }
      var t = pickNearestBundleAtPoint(bundles, x, y, 380);
      if (t) {
        var bk = t.getAttribute("data-ac-detail-id");
        if (bk == null || bk === "") {
          bk = "__bundle_" + Array.prototype.indexOf.call(bundles, t);
        }
        if (bk === lastHoverBossKey) {
          return;
        }
        lastHoverBossKey = bk;
        lastRepelTarget = t;
        applyRepel(t);
      } else {
        if (lastRepelTarget === null) {
          return;
        }
        clearRepel();
      }
    }

    strip.addEventListener("pointermove", onPointerMove, { passive: true });
    strip.addEventListener("pointerleave", clearRepel);
  }

  /**
   * Cụm mùa: nhiều mặt cùng boss (cùng data-ac-detail-id) — hover một mặt thì gắn
   * .home-boss-bundle--detail-hover cho mọi bundle trùng id (giống một bundle nhiều ảnh).
   */
  function initSameBossDetailHoverStrip(strip) {
    if (
      !strip ||
      typeof window.matchMedia === "undefined" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }
    function clearDetailHover() {
      strip
        .querySelectorAll(".home-boss-bundle.home-boss-bundle--detail-hover")
        .forEach(function (b) {
          b.classList.remove("home-boss-bundle--detail-hover");
        });
    }
    strip.addEventListener(
      "mouseover",
      function (e) {
        var bundle = e.target.closest(
          ".home-boss-stack--cluster-wrap .home-boss-bundle[data-ac-detail-id]",
        );
        if (!bundle || !strip.contains(bundle)) return;
        var id = bundle.getAttribute("data-ac-detail-id");
        if (!id) return;
        clearDetailHover();
        var esc = escapeDetailIdAttr(id);
        strip
          .querySelectorAll(
            '.home-boss-stack--cluster-wrap .home-boss-bundle[data-ac-detail-id="' +
              esc +
              '"]',
          )
          .forEach(function (b) {
            b.classList.add("home-boss-bundle--detail-hover");
          });
      },
      true,
    );
    strip.addEventListener("mouseleave", clearDetailHover);
  }

  /** Cụm lưới: hover phóng — đẩy lân cận (chỉ khi có hover chuột). */
  function initClusterHoverRepel() {
    if (
      typeof window.matchMedia === "undefined" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }
    var PUSH = 66;
    var tierStrip = document.getElementById("home-boss-strip");
    if (tierStrip && tierStrip.classList.contains("home-boss-strip--tiered")) {
      initSameBossDetailHoverStrip(tierStrip);
      initTieredStripUnifiedRepel(tierStrip, 18);
    }

    var stacks = document.querySelectorAll(".home-boss-stack--cluster");
    stacks.forEach(function (stack) {
      if (
        tierStrip &&
        tierStrip.classList.contains("home-boss-strip--tiered") &&
        tierStrip.contains(stack)
      ) {
        return;
      }
      var imgs = stack.querySelectorAll(".home-boss-stack__img");
      if (!imgs.length) return;
      var bundleMode = stack.classList.contains("home-boss-stack--bundles");
      var bundles = stack.querySelectorAll(".home-boss-bundle");
      var standaloneImgs = [];
      Array.prototype.forEach.call(imgs, function (img) {
        if (!img.closest(".home-boss-bundle")) {
          standaloneImgs.push(img);
        }
      });

      var lastRepelTarget = null;

      function clearRepel() {
        lastRepelTarget = null;
        stack.classList.remove("home-boss-stack--repel-active");
        Array.prototype.forEach.call(imgs, function (img) {
          img.style.removeProperty("--repel-x");
          img.style.removeProperty("--repel-y");
        });
      }

      function applyRepel(hovered) {
        var hr = hovered.getBoundingClientRect();
        if (hr.width < 1 || hr.height < 1) return;
        var hx = hr.left + hr.width * 0.5;
        var hy = hr.top + hr.height * 0.5;
        stack.classList.add("home-boss-stack--repel-active");
        Array.prototype.forEach.call(imgs, function (img) {
          if (bundleMode) {
            if (hovered.contains(img)) {
              img.style.removeProperty("--repel-x");
              img.style.removeProperty("--repel-y");
              return;
            }
          } else if (img === hovered) {
            img.style.removeProperty("--repel-x");
            img.style.removeProperty("--repel-y");
            return;
          }
          var ir = img.getBoundingClientRect();
          if (ir.width < 1 || ir.height < 1) return;
          var ix = ir.left + ir.width * 0.5;
          var iy = ir.top + ir.height * 0.5;
          var dx = ix - hx;
          var dy = iy - hy;
          var len = Math.sqrt(dx * dx + dy * dy);
          if (len < 0.5) len = 0.5;
          var boost = PUSH * (1 + 24 / len);
          if (bundleMode) {
            boost *= 1.12;
          }
          if (len > 95) {
            boost *= Math.max(0.82, 1 - (len - 95) / 2100);
          }
          var tx = (dx / len) * boost;
          var ty = (dy / len) * boost;
          img.style.setProperty("--repel-x", tx.toFixed(2) + "px");
          img.style.setProperty("--repel-y", ty.toFixed(2) + "px");
        });
      }

      function onPointerMove(e) {
        var br = stack.getBoundingClientRect();
        var x = e.clientX;
        var y = e.clientY;
        if (x < br.left || x > br.right || y < br.top || y > br.bottom) {
          if (lastRepelTarget !== null) {
            clearRepel();
          }
          return;
        }
        var t = findRepelHoverTarget(stack, x, y, bundles, standaloneImgs);
        if (t === lastRepelTarget) {
          return;
        }
        lastRepelTarget = t;
        if (t) {
          applyRepel(t);
        } else {
          clearRepel();
        }
      }

      stack.addEventListener("pointermove", onPointerMove, { passive: true });
      stack.addEventListener("pointerleave", clearRepel);
    });
  }

  function buildFallbackLayout(pool, pathToDetailId) {
    var deco = document.getElementById("home-boss-deco");
    var strip = document.getElementById("home-boss-strip");
    var sh = uniqueInOrder(pool);
    if (!sh.length) return;
    shuffleInPlace(sh);

    var caps = [
      CORNER_AVATAR_COUNT,
      CORNER_AVATAR_COUNT,
      CORNER_AVATAR_COUNT,
      CORNER_AVATAR_COUNT,
      FALLBACK_STRIP_ROW_N,
      FALLBACK_STRIP_ROW_N,
    ];
    var buckets = [[], [], [], [], [], []];
    var bi = 0;
    sh.forEach(function (p) {
      var guard = 0;
      while (guard < 12) {
        if (buckets[bi].length < caps[bi]) {
          buckets[bi].push(p);
          bi = (bi + 1) % 6;
          return;
        }
        bi = (bi + 1) % 6;
        guard++;
      }
    });

    var CORNER_STACKS = [
      { cls: "home-boss-stack home-boss-stack--tl", i: 0 },
      { cls: "home-boss-stack home-boss-stack--tr", i: 1 },
      { cls: "home-boss-stack home-boss-stack--ml", i: 2 },
      { cls: "home-boss-stack home-boss-stack--mr", i: 3 },
    ];

    if (deco) {
      CORNER_STACKS.forEach(function (cfg) {
        var part = buckets[cfg.i];
        if (part.length === 0) return;
        appendStack(deco, cfg.cls, part, pathToDetailId);
      });
    }

    if (strip) {
      strip.classList.remove("home-boss-strip--tiered");
      var STRIP_ROWS = [
        { cls: "home-boss-stack home-boss-stack--strip", i: 4 },
        { cls: "home-boss-stack home-boss-stack--strip", i: 5 },
      ];
      STRIP_ROWS.forEach(function (cfg) {
        var part = buckets[cfg.i];
        if (part.length === 0) return;
        appendStack(strip, cfg.cls, part, pathToDetailId);
      });
    }
  }

  var pathToDetailId = Object.create(null);
  if (
    typeof window.BOSS_TABLE_DETAIL_ROW_ID === "function" &&
    Array.isArray(window.AC_MONG_10_TABLE_DATA)
  ) {
    pathToDetailId = buildPathToDetailId(
      window.AC_MONG_10_TABLE_DATA,
      window.BOSS_TABLE_DETAIL_ROW_ID,
    );
  }

  var rows = window.AC_MONG_10_TABLE_DATA;
  if (hasAcMongBossData(rows)) {
    var bundleTiers = collectBundlesByTier(rows);
    var seasonStripBuckets = collectBundlesBySeasonForStrip(rows);
    var pathTotal = 0;
    var pi;
    for (pi = 0; pi < 3; pi++) {
      var bucket = seasonStripBuckets[pi] || [];
      var bj;
      for (bj = 0; bj < bucket.length; bj++) {
        pathTotal += bucket[bj].paths.length;
      }
    }
    if (pathTotal > 0) {
      buildTieredLayout(bundleTiers, seasonStripBuckets, pathToDetailId);
    }
  }

  initClusterHoverRepel();
  initHomeAcMongDetailNav();

  /** Tab ẩn → tạm dừng CSS animation (giảm CPU; class dùng trong ac-mong-10.css) */
  (function syncHomeAvatarsWithVisibility() {
    var root = document.documentElement;
    function apply() {
      if (typeof document.hidden !== "boolean") return;
      root.classList.toggle("home-page--avatars-paused", document.hidden);
    }
    apply();
    document.addEventListener("visibilitychange", apply);
  })();
})();
