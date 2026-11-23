// Progressive enhancement only: the page works without this file.
(function () {
  var root = document.documentElement, KEY = "theme";
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {} }
  function systemDark() { return !!(media && media.matches); }

  // Theme toggle. The early inline script in <head> has already set data-theme.
  var btn = document.getElementById("theme-toggle");
  function sync() {
    var dark = root.getAttribute("data-theme") === "dark";
    if (btn) btn.setAttribute("aria-pressed", String(dark)); // CSS shows Dark or Light by data-theme
  }
  if (btn) {
    btn.hidden = false;
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      // Remember only a choice that differs from the system setting.
      store(next === (systemDark() ? "dark" : "light") ? null : next);
      sync();
    });
  }
  if (media && media.addEventListener) media.addEventListener("change", function () {
    if (!stored()) { root.setAttribute("data-theme", systemDark() ? "dark" : "light"); sync(); }
  });
  sync();

  // Dropdowns: one open at a time; close on outside click, on choosing a link (a same-page
  // #section jump doesn't reload the page, so the menu would otherwise stay open), or Escape.
  var menus = Array.prototype.slice.call(document.querySelectorAll(".site-nav details"));
  menus.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) menus.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest(".panel a");
    menus.forEach(function (d) { if (d.open && (link || !d.contains(e.target))) d.open = false; });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    menus.forEach(function (d) {
      if (d.open) { d.open = false; d.querySelector("summary").focus(); }
    });
  });
})();

// Label tape: one tilt sequence shared by every label on the page (nav items, category tags, post tags,
// social links and caption strips), counted in document order so neighbouring groups never repeat the same pattern.
// 13 steps (prime, so it won't line up with rows or lists), all within 1.6 degrees.
(function () {
  var tilts = [-.5, .8, -1.3, .3, 1.1, -.8, 1.6, -.15, -1.1, .65, -1.6, 1.3, -.3];
  document.querySelectorAll(".site-nav .top > a, .site-nav .top summary, .site-nav .top > button, .chips a, .social-list a, figcaption h4, figcaption p").forEach(function (el, i) {
    el.style.setProperty("--tilt", tilts[i % tilts.length] + "deg");
  });
})();
