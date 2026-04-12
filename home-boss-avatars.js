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
    if (n <= 1) return "1";
    if (n === 2) return "2";
    if (n === 3) return "3";
    if (n === 4) return "4";
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
   * Lưới gần vuông, hơi rộng ngang (vd 3×3, 4×5, 5×6) — ít dư chiều cao.
   * cols = ceil(sqrt(n)), rows = ceil(n/cols).
   */
  function clusterGridDims(n) {
    if (n <= 0) return { cols: 1, rows: 1 };
    if (n === 1) return { cols: 1, rows: 1 };
    var cols = Math.ceil(Math.sqrt(n));
    cols = Math.min(Math.max(1, cols), n);
    var rows = Math.ceil(n / cols);
    return { cols: cols, rows: rows };
  }

  function appendStack(parent, className, rels) {
    if (!rels || !rels.length) return;
    var stack = document.createElement("div");
    stack.className = className;
    var isStrip = className.indexOf("--strip") !== -1;
    if (isStrip) {
      stack.classList.add("home-boss-stack--cluster");
      if (rels.length >= 8) {
        stack.classList.add("home-boss-stack--strip-dense");
      }
      var g = clusterGridDims(rels.length);
      if (
        typeof window.matchMedia !== "undefined" &&
        window.matchMedia("(max-width: 639px)").matches &&
        g.cols > 3
      ) {
        g.cols = 3;
        g.rows = Math.ceil(rels.length / g.cols);
      }
      stack.style.setProperty("--cluster-cols", String(g.cols));
      stack.style.setProperty("--cluster-rows", String(g.rows));
      stack.setAttribute("data-cluster-grid", g.cols + "x" + g.rows);
      stack.setAttribute("data-cluster-cols", String(g.cols));
    }
    rels.forEach(function (rel, idx) {
      var img = document.createElement("img");
      img.src = encPath(rel);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.className = "home-boss-stack__img";
      img.setAttribute("draggable", "false");
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
  function appendBundleStrip(parent, className, bundles) {
    if (!bundles || !bundles.length) return;
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
      var n = rels.length;
      var wrap = document.createElement("div");
      wrap.className =
        "home-boss-bundle home-boss-bundle--" + bundleLayoutModifier(n);
      wrap.setAttribute("data-bundle-n", String(n));
      if (n === 4) {
        wrap.setAttribute("data-bundle-grid", "2x2");
      } else if (n > 4) {
        var g = clusterGridDims(n);
        if (
          typeof window.matchMedia !== "undefined" &&
          window.matchMedia("(max-width: 639px)").matches &&
          g.cols > 3
        ) {
          g.cols = 3;
          g.rows = Math.ceil(n / g.cols);
        }
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

  function buildTieredLayout(bundleTiers) {
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

        appendBundleStrip(section, "home-boss-stack home-boss-stack--strip", picked);
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
          part
        );
      });
    }
  }

  /**
   * Fallback: pool đã unique, xáo rồi chia đều vòng quanh 4 góc + 2 dải — không lặp path.
   */
  /** Cụm lưới: hover phóng x3 — đẩy avatar lân cận theo vector từ tâm (chỉ khi có hover chuột). */
  function initClusterHoverRepel() {
    if (
      typeof window.matchMedia === "undefined" ||
      !window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      return;
    }
    var PUSH = 56;
    var stacks = document.querySelectorAll(".home-boss-stack--cluster");
    stacks.forEach(function (stack) {
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
          var boost = PUSH * (1 + 26 / len);
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

  function buildFallbackLayout(pool) {
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
        appendStack(deco, cfg.cls, part);
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
        appendStack(strip, cfg.cls, part);
      });
    }
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
      buildTieredLayout(bundleTiers);
    } else {
      buildFallbackLayout(shuffleInPlace(PB10.concat(PB5)));
    }
  } else {
    buildFallbackLayout(shuffleInPlace(PB10.concat(PB5)));
  }

  initClusterHoverRepel();

  /** Định kỳ đổi preset animation (inline) */
  var XP_NAMES = [
    "home-avl-xp1",
    "home-avl-xp2",
    "home-avl-xp3",
    "home-avl-xp4",
    "home-avl-xp5",
    "home-avl-xp6",
    "home-avl-xp7",
    "home-avl-xp8",
  ];
  var XP_EASE = [
    "cubic-bezier(0.4, 0, 0.2, 1)",
    "ease-in-out",
    "cubic-bezier(0.45, 0, 0.55, 1)",
    "cubic-bezier(0.34, 0.85, 0.47, 1.1)",
    "cubic-bezier(0.42, 0, 0.58, 1)",
  ];

  function rndDur() {
    return (2.85 + Math.random() * 1.35).toFixed(2) + "s";
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function stableDelay(idx) {
    return (idx * 0.052).toFixed(3) + "s";
  }

  function swapAvatarAnim(img, idx, revertToCss) {
    var delay = stableDelay(idx);
    img.style.transition = "opacity 0.18s ease-out";
    img.style.opacity = "0.93";
    setTimeout(function () {
      if (revertToCss) {
        img.style.animation = "";
        img.style.animationDelay = "";
      } else {
        img.style.animation = "none";
        void img.offsetHeight;
        var name = pick(XP_NAMES);
        var ease = pick(XP_EASE);
        var dur = rndDur();
        img.style.animation =
          name + " " + dur + " " + ease + " infinite";
        img.style.animationDelay = delay;
      }
      requestAnimationFrame(function () {
        img.style.opacity = "1";
        setTimeout(function () {
          img.style.transition = "";
        }, 220);
      });
    }, 55);
  }

  function rotateAvatarAnimations() {
    var imgs = document.querySelectorAll(
      ".home-boss-deco .home-boss-stack__img, .home-boss-strip .home-boss-stack__img"
    );
    if (!imgs.length) return;
    imgs.forEach(function (img, idx) {
      if (Math.random() > 0.42) return;
      swapAvatarAnim(img, idx, Math.random() < 0.22);
    });
  }

  function scheduleAvatarAnimShuffle() {
    var next = 15000 + Math.random() * 18000;
    setTimeout(function () {
      rotateAvatarAnimations();
      scheduleAvatarAnimShuffle();
    }, next);
  }

  setTimeout(function () {
    scheduleAvatarAnimShuffle();
  }, 16000 + Math.random() * 12000);
})();
