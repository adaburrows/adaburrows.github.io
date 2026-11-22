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
    if (btn) { btn.textContent = dark ? "Light" : "Dark"; btn.setAttribute("aria-pressed", String(dark)); }
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

  // Dropdowns: one open at a time; close on outside click or Escape.
  var menus = Array.prototype.slice.call(document.querySelectorAll(".site-nav details"));
  menus.forEach(function (d) {
    d.addEventListener("toggle", function () {
      if (d.open) menus.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
  document.addEventListener("click", function (e) {
    menus.forEach(function (d) { if (d.open && !d.contains(e.target)) d.open = false; });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    menus.forEach(function (d) {
      if (d.open) { d.open = false; d.querySelector("summary").focus(); }
    });
  });
})();
