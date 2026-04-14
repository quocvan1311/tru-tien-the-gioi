/**
 * Trang chủ: nền ảnh phụ bản 5 (mỗi path một lần), 2 hàng chia gần đều, chồng trong hàng.
 * Cần phu-ban-5.js — `window.PHU_BAN_5_TABLE_DATA`.
 */
(function () {
  "use strict";

  function encPath(rel) {
    return rel.split("/").map(encodeURIComponent).join("/");
  }

  function collectPb5Paths(rows) {
    var out = [];
    var seen = Object.create(null);
    if (!Array.isArray(rows)) return out;
    rows.forEach(function (row) {
      var bi = row.__bossImages;
      if (!bi || typeof bi !== "object") return;
      Object.keys(bi).forEach(function (slot) {
        var list = bi[slot];
        if (!Array.isArray(list)) return;
        list.forEach(function (p) {
          if (p == null) return;
          var s = String(p).trim();
          if (!s || seen[s]) return;
          seen[s] = true;
          out.push(s);
        });
      });
    });
    return out;
  }

  var rows = window.PHU_BAN_5_TABLE_DATA;
  var paths = collectPb5Paths(rows);
  if (!paths.length) return;

  var host = document.getElementById("home-pb5-fill");
  if (!host) return;

  var n = paths.length;
  var mid = Math.ceil(n / 2);
  var topPaths = paths.slice(0, mid);
  var botPaths = paths.slice(mid);

  function appendRow(className, list) {
    var row = document.createElement("div");
    row.className = "home-pb5-fill__row " + className;
    var j;
    for (j = 0; j < list.length; j++) {
      var img = document.createElement("img");
      img.src = encPath(list[j]);
      img.alt = "";
      img.className = "home-pb5-fill__img";
      img.loading = "lazy";
      img.decoding = "async";
      img.setAttribute("draggable", "false");
      img.style.zIndex = String(j + 1);
      row.appendChild(img);
    }
    host.appendChild(row);
  }

  appendRow("home-pb5-fill__row--top", topPaths);
  if (botPaths.length) {
    appendRow("home-pb5-fill__row--bottom", botPaths);
  }
})();
