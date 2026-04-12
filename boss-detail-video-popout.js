/**
 * Trang chi tiết BOSS: nút phóng video (aside .boss-detail__aside--videos) ra giữa màn hình.
 * Hai video: ưu tiên đưa lên trên khung đang phát (HTML5 hoặc YouTube có enablejsapi), không thì video đầu.
 */
(function () {
  "use strict";

  var YT_ORIGIN = "https://www.youtube.com";

  function lockPageScroll(lock) {
    var root = document.documentElement;
    if (lock) {
      root.classList.add("boss-detail--video-popout-active");
    } else {
      root.classList.remove("boss-detail--video-popout-active");
    }
  }

  function tryParseJson(str) {
    if (typeof str !== "string" || str.charAt(0) !== "{") {
      return null;
    }
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }

  /** YouTube iframe (enablejsapi=1): trạng thái đang phát ≈ 1 */
  function isYoutubePlayingPayload(data) {
    if (data == null || typeof data !== "object") {
      return false;
    }
    if (data.event === "onStateChange") {
      var inf = data.info;
      if (inf === 1 || inf === "1") {
        return true;
      }
      if (inf && typeof inf === "object" && inf.data === 1) {
        return true;
      }
    }
    if (data.event === "infoDelivery" && data.info && data.info.playerState === 1) {
      return true;
    }
    return false;
  }

  function ensureYoutubeIframeJsApi(iframe) {
    var src = iframe.getAttribute("src");
    if (!src || src.indexOf("youtube.com/embed") === -1) {
      return;
    }
    if (/[?&]enablejsapi=1(?:&|$)/.test(src)) {
      return;
    }
    var base = src.split("#")[0];
    iframe.src = base + (base.indexOf("?") >= 0 ? "&" : "?") + "enablejsapi=1";
  }

  /**
   * @param {HTMLElement} aside — .boss-detail__aside--videos
   */
  function initBossDetailVideoPopout(aside) {
    if (!aside || !aside.classList || !aside.classList.contains("boss-detail__aside--videos")) {
      return;
    }
    if (aside.getAttribute("data-boss-detail-video-popout-init")) {
      return;
    }
    aside.setAttribute("data-boss-detail-video-popout-init", "1");

    var heading = aside.querySelector(".boss-detail__video-heading");
    if (!heading) {
      return;
    }

    var stack = aside.querySelector(".boss-detail__video-stack");
    if (!stack) {
      return;
    }

    var row = document.createElement("div");
    row.className = "boss-detail__video-heading-row";
    aside.insertBefore(row, heading);
    row.appendChild(heading);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "boss-detail__video-popout-btn";
    btn.setAttribute("aria-pressed", "false");
    btn.title = "Phóng to video giữa màn hình";
    btn.textContent = "Phóng to";

    row.appendChild(btn);

    var backdrop = null;
    /** @type {HTMLElement[]|null} thứ tự node .boss-detail__video-frame trước khi popout */
    var savedFrameOrder = null;
    /** index khung YouTube / HTML5 vừa báo đang phát (ưu tiên sau native đang play tại thời điểm mở) */
    var lastPlayingFrameIndex = null;

    function getFrameEls() {
      return stack.querySelectorAll(":scope > .boss-detail__video-frame");
    }

    function wireFrameTracking() {
      var frames = getFrameEls();
      var fi;
      for (fi = 0; fi < frames.length; fi++) {
        (function (frame, index) {
          var vid = frame.querySelector("video");
          if (vid) {
            vid.addEventListener("play", function () {
              lastPlayingFrameIndex = index;
            });
          }
          var iframe = frame.querySelector('iframe[src*="youtube.com/embed"]');
          if (iframe) {
            ensureYoutubeIframeJsApi(iframe);
          }
        })(frames[fi], fi);
      }
    }

    wireFrameTracking();

    function onYoutubeMessage(e) {
      if (e.origin !== YT_ORIGIN) {
        return;
      }
      var raw = e.data;
      var data = typeof raw === "string" ? tryParseJson(raw) : raw;
      if (!isYoutubePlayingPayload(data)) {
        return;
      }
      var frames = getFrameEls();
      var i;
      for (i = 0; i < frames.length; i++) {
        var iframe = frames[i].querySelector("iframe");
        if (iframe && iframe.contentWindow === e.source) {
          lastPlayingFrameIndex = i;
          return;
        }
      }
    }

    window.addEventListener("message", onYoutubeMessage);

    /** Ưu tiên: HTML5 đang play tại lúc mở → lastPlayingFrameIndex → 0 */
    function resolvePreferredFrameIndex() {
      var frames = getFrameEls();
      var n = frames.length;
      if (n < 2) {
        return 0;
      }
      var i;
      for (i = 0; i < n; i++) {
        var vid = frames[i].querySelector("video");
        if (vid && !vid.paused && !vid.ended) {
          return i;
        }
      }
      if (
        lastPlayingFrameIndex != null &&
        lastPlayingFrameIndex >= 0 &&
        lastPlayingFrameIndex < n
      ) {
        return lastPlayingFrameIndex;
      }
      return 0;
    }

    function applyPreferredOrder() {
      var frames = getFrameEls();
      if (frames.length < 2) {
        return;
      }
      savedFrameOrder = Array.prototype.slice.call(frames);
      var idx = resolvePreferredFrameIndex();
      if (idx > 0 && idx < frames.length) {
        stack.insertBefore(frames[idx], stack.firstChild);
      }
    }

    function restoreFrameOrder() {
      if (!savedFrameOrder || !savedFrameOrder.length) {
        savedFrameOrder = null;
        return;
      }
      var i;
      for (i = 0; i < savedFrameOrder.length; i++) {
        stack.appendChild(savedFrameOrder[i]);
      }
      savedFrameOrder = null;
    }

    function closePopout() {
      aside.classList.remove("boss-detail__aside--videos--popout");
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = "Phóng to";
      btn.title = "Phóng to video giữa màn hình";
      lockPageScroll(false);
      restoreFrameOrder();
      if (backdrop && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
        backdrop = null;
      }
    }

    function openPopout() {
      applyPreferredOrder();
      aside.classList.add("boss-detail__aside--videos--popout");
      btn.setAttribute("aria-pressed", "true");
      btn.textContent = "Thu nhỏ";
      btn.title = "Trả video về vị trí trong trang";
      lockPageScroll(true);
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "boss-detail__video-popout-backdrop";
        backdrop.setAttribute("aria-hidden", "true");
        document.body.insertBefore(backdrop, document.body.firstChild);
        backdrop.addEventListener("click", closePopout);
      }
    }

    function toggle() {
      if (aside.classList.contains("boss-detail__aside--videos--popout")) {
        closePopout();
      } else {
        openPopout();
      }
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      toggle();
    });

    document.addEventListener("keydown", function onKey(e) {
      if (
        e.key === "Escape" &&
        aside.classList.contains("boss-detail__aside--videos--popout")
      ) {
        closePopout();
      }
    });
  }

  window.initBossDetailVideoPopout = initBossDetailVideoPopout;
})();
