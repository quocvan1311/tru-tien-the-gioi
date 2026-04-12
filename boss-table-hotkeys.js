/**
 * Listing (ac-mong-10 / luyen-nguc-10): gõ số Index trong 2s → overlay hiển thị buffer;
 * khớp đúng Index (trong các dòng đang hiển thị) → sau ~0.5s mới mở chi tiết.
 * Listing (ac-mong / luyện ngục): buffer rỗng + Backspace → index.html; có buffer thì xóa số.
 * Listing phu-ban-5.html: Backspace → index.html.
 * Chi tiết: Backspace → về bảng (link trong .site-nav).
 */
(function () {
  "use strict";

  var IDLE_MS = 2000;
  var NAV_DELAY_MS = 500;
  var buffer = "";
  var idleTimer = null;
  var navTimer = null;
  var overlayEl = null;

  function isIndexListingPage() {
    var p = location.pathname || "";
    return /ac-mong-10\.html$/i.test(p) || /luyen-nguc-10\.html$/i.test(p);
  }

  function isPhuBanListingPage() {
    var p = location.pathname || "";
    return /phu-ban-5\.html$/i.test(p);
  }

  function isEditableTarget(el) {
    if (!el) return false;
    var t = el.tagName;
    if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function rowIndexString(row) {
    var v = row["Index"];
    if (v === null || v === undefined) return "";
    if (Array.isArray(v)) return String(v[0] != null ? v[0] : "").trim();
    return String(v).trim();
  }

  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement("div");
    overlayEl.id = "boss-index-jump-overlay";
    overlayEl.setAttribute("aria-live", "polite");
    overlayEl.setAttribute("aria-atomic", "true");
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function showOverlay(text) {
    var el = ensureOverlay();
    el.textContent = text || "";
    if (text) {
      el.classList.add("boss-index-jump-overlay--visible");
    } else {
      el.classList.remove("boss-index-jump-overlay--visible");
    }
  }

  function cancelNavigateTimer() {
    if (navTimer) {
      clearTimeout(navTimer);
      navTimer = null;
    }
  }

  function clearBuffer() {
    buffer = "";
    showOverlay("");
    cancelNavigateTimer();
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function scheduleIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      clearBuffer();
    }, IDLE_MS);
  }

  function findIndexMatches(buf) {
    var state = window.__BOSS_TABLE_LISTING_FOR_JUMP__;
    if (!state || !state.rows) return [];
    var rows = state.rows;
    var matches = [];
    for (var i = 0; i < rows.length; i++) {
      if (rowIndexString(rows[i]) === buf) {
        matches.push(rows[i]);
      }
    }
    return matches;
  }

  function scheduleNavigateIfMatch() {
    cancelNavigateTimer();
    var state = window.__BOSS_TABLE_LISTING_FOR_JUMP__;
    if (!state || !buffer) return;
    var base = state.detailBase;
    var getId = state.detailRowId;
    if (!base || typeof getId !== "function") return;

    var matches = findIndexMatches(buffer);
    if (matches.length === 0) return;

    var expectedBuf = buffer;
    navTimer = setTimeout(function () {
      navTimer = null;
      if (buffer !== expectedBuf) return;
      var state2 = window.__BOSS_TABLE_LISTING_FOR_JUMP__;
      if (!state2 || !state2.rows) return;
      var getId2 = state2.detailRowId;
      var base2 = state2.detailBase;
      if (!base2 || typeof getId2 !== "function") return;
      var matches2 = findIndexMatches(buffer);
      if (matches2.length === 0) return;

      var row = matches2[0];
      var id = getId2(row);
      var sep = base2.indexOf("?") >= 0 ? "&" : "?";
      clearBuffer();
      location.href = base2 + sep + "id=" + encodeURIComponent(id);
    }, NAV_DELAY_MS);
  }

  document.addEventListener(
    "keydown",
    function (e) {
      if (!isIndexListingPage()) return;
      if (!window.__BOSS_TABLE_LISTING_FOR_JUMP__) return;
      if (isEditableTarget(document.activeElement)) return;

      var k = e.key;
      if (k === "Escape") {
        if (buffer) {
          e.preventDefault();
          clearBuffer();
        }
        return;
      }

      if (k === "Backspace") {
        if (buffer.length > 0) {
          e.preventDefault();
          buffer = buffer.slice(0, -1);
          showOverlay(buffer);
          scheduleIdle();
          scheduleNavigateIfMatch();
        } else {
          e.preventDefault();
          location.href = "index.html";
        }
        return;
      }

      if (k.length === 1 && k >= "0" && k <= "9") {
        e.preventDefault();
        buffer += k;
        if (buffer.length > 16) buffer = buffer.slice(-16);
        showOverlay(buffer);
        scheduleIdle();
        scheduleNavigateIfMatch();
      }
    },
    false
  );

  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key !== "Backspace") return;
      if (!isPhuBanListingPage()) return;
      if (isEditableTarget(document.activeElement)) return;
      e.preventDefault();
      location.href = "index.html";
    },
    false
  );

  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key !== "Backspace") return;
      if (!document.body.classList.contains("boss-detail-page")) return;
      var t = e.target;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }
      try {
        if (new URLSearchParams(location.search).get("from") === "index") {
          e.preventDefault();
          location.href = "index.html";
          return;
        }
      } catch (err) {}
      var a = document.querySelector(
        '.site-nav a[href$="ac-mong-10.html"], .site-nav a[href$="luyen-nguc-10.html"], .site-nav a[href$="phu-ban-5.html"]'
      );
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href) return;
      e.preventDefault();
      location.href = href;
    },
    false
  );
})();
