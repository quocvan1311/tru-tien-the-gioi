/**
 * Trang chủ: avatar BOSS — gom theo Độ khó (≥1000 / ≥750 / ≥500 / <500)
 * mỗi ảnh chỉ hiển thị một lần; mỗi dòng bảng (__images) là một cụm dính (layout 1–4+);
 * cần ac-mong-10.js (BOSS_TABLE_DATA).
 */
(function () {
  "use strict";

  var PB10 = [
    "phu ban 10/111 van sa ich ta.JPG",
    "phu ban 10/123 do ach nien lao dai.JPG",
    "phu ban 10/131 u kiep cuu u yeu thu.JPG",
    "phu ban 10/213 co long lang tieu hanh van.JPG",
    "phu ban 10/233 quy nguu dao nhiem no.JPG",
    "phu ban 10/234 quy nguu dao quy nguu.JPG",
    "phu ban 10/311 hoa tu la.JPG",
    "phu ban 10/321 suong phong phuong do.JPG",
    "phu ban 10/331 chi duc gioi su.JPG",
    "phu ban 10/222 du lan mac khue p2.JPG",
    "phu ban 10/231 quy nguu dao bach doc tu.JPG",
    "phu ban 10/132 u kiep hac thuy huyen xa.JPG",
  ];

  var PB5 = [
    "phu ban 5/11 han dam le anh boss 1 - son than.JPG",
    "phu ban 5/11 han dam le anh boss 2 - tieu khoi.JPG",
    "phu ban 5/12 ho thap boss 1 - khoc huyet la sat.JPG",
    "phu ban 5/12 ho thap boss 3 - huyen ma am mi.JPG",
    "phu ban 5/13 hoang tuyen boss 2 - manh ba.JPG",
    "phu ban 5/14 ta tong boss 1 - ngao liet.JPG",
    "phu ban 5/15 tram han boss 3 - bao le phi giao.JPG",
    "phu ban 5/16 hac thach boss 1 - tam vi yeu ho.JPG",
    "phu ban 5/21 phi chu boss 2 - hoanh hanh cong.JPG",
    "phu ban 5/22 ham son boss 3 - thon sat ban son lao quai.JPG",
    "phu ban 5/31 tuyet linh boss 1 - tham lam gia lau la.JPG",
    "phu ban 5/31 tuyet linh boss 3 - no tuong ma la.JPG",
  ];

  function encPath(rel) {
    return rel.split("/").map(encodeURIComponent).join("/");
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
    return String(p || "")
      .toLowerCase()
      .indexOf("phu ban 10/") !== -1;
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
      return (
        "ac-mong-detail.html?id=" +
        encodeURIComponent(id) +
        "&from=index"
      );
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
   * Lưới cụm avatar: ưu tiên bảng “đẹp” khi có thể — 2×2, 3×3, 3×4 (12 ảnh), hình chữ nhật đầy,
   * tránh hàng cuối 1 ô; hòa điểm → cột gần √n (cột tier hẹp).
   */
  function clusterGridDims(n) {
    if (n <= 0) return { cols: 1, rows: 1 };
    if (n === 1) return { cols: 1, rows: 1 };

    var target = Math.sqrt(n);
    var best = null;
    var bestScore = Infinity;
    var bestDist = Infinity;

    var c;
    for (c = 1; c <= n; c++) {
      var r = Math.ceil(n / c);
      var inLast = n - (r - 1) * c;
      if (inLast <= 0) {
        inLast = c;
      }
      var imbal = Math.abs(c - r);
      var score = imbal * 2;
      if (r > 1 && inLast === 1) {
        score += 100;
      }
      if (r > 2 && inLast === 2) {
        score += 3;
      }
      if (c * r === n) {
        score -= 14;
      }
      if (c === r && n > 1) {
        score -= 4;
      }

      var dist = Math.abs(c - target);
      if (
        !best ||
        score < bestScore ||
        (score === bestScore && dist < bestDist) ||
        (score === bestScore && dist === bestDist && c < best.cols)
      ) {
        bestScore = score;
        bestDist = dist;
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
          "important"
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
   * Dải tier: nhiều bundle (mỗi bundle = một dòng __images); layout 1 / 2 / 3 / 4 / nhiều.
   */
  function appendBundleStrip(parent, className, bundles, pathToDetailId) {
    if (!bundles || !bundles.length) return;
    pathToDetailId = pathToDetailId || Object.create(null);
    var stack = document.createElement("div");
    stack.className =
      className +
      " home-boss-stack--bundles home-boss-stack--cluster";
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
      var rels = bundle.paths;
      var n = rels.length | 0;
      var wrap = document.createElement("div");
      wrap.className =
        "home-boss-bundle home-boss-bundle--" + bundleLayoutModifier(n);
      wrap.setAttribute("data-bundle-n", String(n));
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
          "important"
        );
        wrap.style.setProperty(
          "grid-template-rows",
          "repeat(2, minmax(0, max-content))",
          "important"
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
      rels.forEach(function (rel) {
        var img = document.createElement("img");
        img.src = encPath(rel);
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.className = "home-boss-stack__img";
        img.setAttribute("draggable", "false");
        img.style.animationDelay = (globalIdx * 0.055).toFixed(3) + "s";
        wrap.appendChild(img);
        globalIdx++;
      });
      stack.appendChild(wrap);
    });
    parent.appendChild(stack);
  }

  function hasAcMongBossData(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return false;
    var r = rows[0];
    return r && "Độ khó" in r && Array.isArray(r.__images);
  }

  /** Góc: nhiều avatar hơn; dải tier: tối đa mỗi cụm (4 cụm cạnh nhau) */
  var CORNER_AVATAR_COUNT = 6;
  var STRIP_CLUSTER_MAX = 18;
  /** Fallback 2 hàng: vừa viewport, không cần cụm tier quá rộng */
  var FALLBACK_STRIP_ROW_N = 12;

  function buildTieredLayout(bundleTiers, pathToDetailId) {
    var pathTiers = tiersFlatFromBundles(bundleTiers);
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

      var TIER_KEYS = ["t1000", "t750", "t500", "tlow"];

      TIER_KEYS.forEach(function (key, idx) {
        var rawBundles = bundleTiers[idx] || [];
        var availBundles = rawBundles.filter(function (b) {
          var ok = true;
          b.paths.forEach(function (p) {
            if (used[p]) ok = false;
          });
          return ok && b.paths.length > 0;
        });
        if (!availBundles.length) return;

        shuffleInPlace(availBundles);
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
        if (!picked.length) return;

        picked.forEach(function (b) {
          b.paths.forEach(function (p) {
            used[p] = true;
          });
        });

        var section = document.createElement("section");
        section.className = "home-boss-tier home-boss-tier--" + key;

        appendBundleStrip(
          section,
          "home-boss-stack home-boss-stack--strip",
          picked,
          pathToDetailId
        );
        strip.appendChild(section);
      });
    }

    if (deco) {
      CORNERS.forEach(function (cfg) {
        var part = takeUniquePreferTier(
          pathTiers,
          cfg.tier,
          CORNER_AVATAR_COUNT,
          used
        );
        if (part.length === 0) return;
        appendStack(
          deco,
          cfg.cls + " home-boss-stack--diff-t" + cfg.tier,
          part,
          pathToDetailId
        );
      });
    }
  }

  /**
   * Fallback: pool đã unique, xáo rồi chia đều vòng quanh 4 góc + 2 dải — không lặp path.
   */
  /**
   * Dải tier (4 section): một nhóm repel — hover một bundle/ảnh thì đẩy mọi avatar trong
   * toàn bộ #home-boss-strip, không chỉ trong cùng .home-boss-stack--cluster.
   */
  function initTieredStripUnifiedRepel(strip, PUSH) {
    var clusterStacks = strip.querySelectorAll(".home-boss-stack--cluster");
    var imgs = strip.querySelectorAll(".home-boss-stack__img");
    if (!imgs.length) return;

    function clearRepel() {
      Array.prototype.forEach.call(clusterStacks, function (s) {
        s.classList.remove("home-boss-stack--repel-active");
      });
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
      Array.prototype.forEach.call(clusterStacks, function (s) {
        s.classList.add("home-boss-stack--repel-active");
      });
      var hoveredIsBundle =
        hovered.classList &&
        hovered.classList.contains("home-boss-bundle");
      Array.prototype.forEach.call(imgs, function (img) {
        if (hoveredIsBundle) {
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
        if (hoveredIsBundle) {
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

    var bundles = strip.querySelectorAll(".home-boss-bundle");
    Array.prototype.forEach.call(bundles, function (bundle) {
      bundle.addEventListener("mouseenter", function () {
        applyRepel(bundle);
      });
    });
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.closest(".home-boss-bundle")) return;
      img.addEventListener("mouseenter", function () {
        applyRepel(img);
      });
    });

    strip.addEventListener("mouseleave", function (e) {
      var rt = e.relatedTarget;
      if (!rt || !strip.contains(rt)) clearRepel();
    });
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
    if (
      tierStrip &&
      tierStrip.classList.contains("home-boss-strip--tiered")
    ) {
      initTieredStripUnifiedRepel(tierStrip, PUSH);
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

      function clearRepel() {
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

      if (bundleMode) {
        var bundles = stack.querySelectorAll(".home-boss-bundle");
        Array.prototype.forEach.call(bundles, function (bundle) {
          bundle.addEventListener("mouseenter", function () {
            applyRepel(bundle);
          });
        });
      } else {
        Array.prototype.forEach.call(imgs, function (img) {
          img.addEventListener("mouseenter", function () {
            applyRepel(img);
          });
        });
      }

      stack.addEventListener("mouseleave", function (e) {
        var rt = e.relatedTarget;
        if (!rt || !stack.contains(rt)) clearRepel();
      });
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
    Array.isArray(window.BOSS_TABLE_DATA)
  ) {
    pathToDetailId = buildPathToDetailId(
      window.BOSS_TABLE_DATA,
      window.BOSS_TABLE_DETAIL_ROW_ID
    );
  }

  var rows = window.BOSS_TABLE_DATA;
  if (hasAcMongBossData(rows)) {
    var bundleTiers = collectBundlesByTier(rows);
    var pathTotal = 0;
    var pi;
    for (pi = 0; pi < 4; pi++) {
      var tier = bundleTiers[pi];
      var bj;
      for (bj = 0; bj < tier.length; bj++) {
        pathTotal += tier[bj].paths.length;
      }
    }
    if (pathTotal > 0) {
      buildTieredLayout(bundleTiers, pathToDetailId);
    } else {
      buildFallbackLayout(shuffleInPlace(PB10.concat(PB5)), pathToDetailId);
    }
  } else {
    buildFallbackLayout(shuffleInPlace(PB10.concat(PB5)), pathToDetailId);
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
