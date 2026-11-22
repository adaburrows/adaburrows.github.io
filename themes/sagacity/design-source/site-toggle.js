// The theme follows the viewer's Claude setting, which every artifact page shares: the
// viewer sets data-theme="dark"|"light" on the root for an explicit choice, and sets nothing
// for "system", where prefers-color-scheme decides. Each page runs in its own origin, so a
// choice stored by one page could never reach the others; following the viewer's setting is
// what keeps every page in step (operator 2026-10-15). The button flips this view only and is
// not stored. The page's own attribute is data-nh, so it never overwrites the viewer's.
(function () {
  const root = document.documentElement, btn = document.getElementById("theme");
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  let flipped = false;
  const viewerDark = () => {
    const t = root.getAttribute("data-theme");
    if (t === "dark") return true;
    if (t === "light") return false;
    return !!(media && media.matches);
  };
  const apply = () => {
    const dark = viewerDark() !== flipped;
    root.setAttribute("data-nh", dark ? "dark" : "light");
    btn.textContent = dark ? "Light" : "Dark";
    btn.setAttribute("aria-pressed", String(dark));
  };
  apply();
  btn.addEventListener("click", () => { flipped = !flipped; apply(); });
  // A change of the viewer's setting while the page is open takes effect at once and
  // clears this view's flip, so the page again matches every other page.
  new MutationObserver(() => { flipped = false; apply(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  if (media && media.addEventListener) media.addEventListener("change", () => { flipped = false; apply(); });
})();
