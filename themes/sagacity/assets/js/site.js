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

// Caption labels: give each one its own hand-placed tilt by its order on the page (the CSS cycle
// is keyed to sibling position, which repeats inside column layouts). Titles up to 6.5deg.
(function () {
  var title = [-4, 3, -6.5, 5, -2, 6, -3, 1.5, -5.5, 2.5], text = [1.2, -1.6, .7, -1, 2, -.6, 1.5, -2];
  document.querySelectorAll("figcaption").forEach(function (c, i) {
    var h = c.querySelector("h4"), p = c.querySelector("p");
    if (h) h.style.setProperty("--tilt", title[i % title.length] + "deg");
    if (p) p.style.setProperty("--tilt", text[i % text.length] + "deg");
  });
})();
