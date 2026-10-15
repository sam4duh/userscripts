// ==UserScript==
// @name         Distraction Blocker (IG DMs only + YouTube no Shorts)
// @namespace    https://github.com/sam4duh
// @version      1.0.0
// @description  Instagram: DMs only, no Reels/posts/Explore. YouTube: Shorts open as normal videos and are hidden.
// @match        https://www.instagram.com/*
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/sam4duh/userscripts/main/distraction-blocker.user.js
// @updateURL    https://raw.githubusercontent.com/sam4duh/userscripts/main/distraction-blocker.user.js
// ==/UserScript==
(function () {
  const host = location.hostname;
  let site;

  if (host.endsWith('instagram.com')) {
    const BLOCK = /^\/(reels?|p|explore)(\/|$)/;
    site = {
      // returns a target URL if the path is blocked, otherwise null
      resolve: p => (p === '/' || BLOCK.test(p) ? '/direct/inbox/' : null),
      // in-app clicks/navigation: just swallow them
      onBlocked: () => {},
      css: 'a[href="/"], a[href^="/reels"], a[href^="/explore"]{display:none!important}',
    };
  } else if (host.endsWith('youtube.com')) {
    site = {
      resolve: p => {
        const m = p.match(/^\/shorts\/([\w-]+)/);
        return m ? '/watch?v=' + m[1] : null;
      },
      // in-app clicks/navigation: open the normal watch page
      onBlocked: t => location.assign(t),
      css: `
        ytd-reel-shelf-renderer,
        ytd-rich-shelf-renderer[is-shorts],
        ytd-guide-entry-renderer:has(a[title="Shorts"]),
        ytd-mini-guide-entry-renderer[aria-label="Shorts"],
        ytd-rich-item-renderer:has(a[href^="/shorts/"]),
        ytd-video-renderer:has(a[href^="/shorts/"]),
        ytd-grid-video-renderer:has(a[href^="/shorts/"]),
        ytm-reel-shelf-renderer,
        ytm-shorts-lockup-view-model,
        grid-shelf-view-model:has(a[href^="/shorts/"]),
        a[title="Shorts"] { display: none !important; }
      `,
    };
  } else {
    return;
  }

  const target = url => site.resolve(new URL(url, location.href).pathname);

  // Direct loads of a blocked page
  const t0 = site.resolve(location.pathname);
  if (t0) location.replace(t0);

  // In-app (SPA) navigation
  for (const m of ['pushState', 'replaceState']) {
    const orig = history[m];
    history[m] = function (state, title, url) {
      if (url) {
        const t = target(url);
        if (t) { site.onBlocked(t); return; }
      }
      return orig.apply(this, arguments);
    };
  }

  // Clicks on blocked links
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const t = target(a.href);
    if (t) {
      e.preventDefault();
      e.stopImmediatePropagation();
      site.onBlocked(t);
    }
  }, true);

  // Hide menu entries and shelves
  const s = document.createElement('style');
  s.textContent = site.css;
  document.documentElement.appendChild(s);
})();
