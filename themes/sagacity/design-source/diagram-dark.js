// Recolour a light-palette diagram SVG for the dark theme, keeping every colour's hue
// (operator 2026-11-05, resolution-615-recolour-dark-diagrams: "if you read that something
// should have a certain color, it will have that color, just a different shade"). A colour equal
// to a light site token becomes that token's dark value (pairs read from site.css); any other
// colour keeps its OKLCH hue and chroma and moves along a lightness curve: the white ground goes
// black, pastel fills become dark tints of the same hue, mid strokes and dark text go light.
// Used by render-svg.cjs at build time and by pages that render mermaid in the browser.
(function (root) {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const unl = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  function oklab([r, g, b]) {
    [r, g, b] = [r, g, b].map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  }
  function fromLab(L, a, b) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  // light lightness -> dark lightness (OKLab L), piecewise linear through these points
  const CURVE = [[0, 0.93], [0.5, 0.72], [0.9, 0.33], [1, 0.17]];
  function curve(L) {
    for (let i = 1; i < CURVE.length; i++) {
      const [x0, y0] = CURVE[i - 1], [x1, y1] = CURVE[i];
      if (L <= x1) return y0 + ((L - x0) / (x1 - x0)) * (y1 - y0);
    }
    return CURVE[CURVE.length - 1][1];
  }
  function shade(rgb) {
    const [L, a, b] = oklab(rgb);
    const C = Math.hypot(a, b), h = Math.atan2(b, a), L2 = curve(L);
    // a dark tint needs a little more chroma than its pastel to read as the same hue
    for (let c = C * (L2 < 0.4 ? 1.3 : 1); c >= 0; c -= 0.002) {
      const out = fromLab(L2, c * Math.cos(h), c * Math.sin(h));
      if (out.every((v) => v >= -1e-4 && v <= 1 + 1e-4)) return out.map((v) => unl(Math.min(1, Math.max(0, v))));
    }
    return [L2, L2, L2].map(() => unl(L2 ** 3));
  }
  const hex = (rgb) => '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
  function parseHex(h) {
    h = h.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }
  function hslToRgb(h, s, l) {
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)));
  }
  // light hex -> dark hex for every token defined as a hex in both site.css theme blocks
  function pairsFromCss(css) {
    const block = (re) => { const m = css.match(re); return m ? m[1] : ''; };
    const toks = (b) => Object.fromEntries([...b.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\b/g)].map((m) => [m[1], m[2]]));
    const light = toks(block(/:root\s*\{([^}]*)\}/)), dark = toks(block(/:root\[data-nh="dark"\]\s*\{([^}]*)\}/));
    const pairs = {};
    for (const k of Object.keys(light)) if (dark[k]) pairs[hex(parseHex(light[k]))] = hex(parseHex(dark[k]));
    return pairs;
  }
  function makeDarkener(pairs) {
    const map = (rgb) => { const h = hex(rgb); return pairs[h] ? parseHex(pairs[h]) : shade(rgb); };
    const NAMED = { white: [1, 1, 1], black: [0, 0, 0], red: [1, 0, 0] };
    const recolour = (seg) => seg
        .replace(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m) => hex(map(parseHex(m))))
        .replace(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(,\s*[\d.]+\s*)?\)/g, (m, r, g, b, a) => {
          const [R, G, B] = map([r / 255, g / 255, b / 255]).map((v) => Math.round(v * 255));
          return a ? `rgba(${R}, ${G}, ${B}${a})` : `rgb(${R}, ${G}, ${B})`;
        })
        .replace(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(,\s*[\d.]+\s*)?\)/g, (m, h, s, l, a) => {
          const out = hex(map(hslToRgb(+h, s / 100, l / 100)));
          return a ? `rgba(${parseHex(out).map((v) => Math.round(v * 255)).join(', ')}${a})` : out;
        })
        .replace(/((?:fill|stroke|color|background(?:-color)?)\s*[:=]\s*"?)(white|black|red)\b/g, (m, p, n) => p + hex(map(NAMED[n])));
    // only markup and stylesheets: text nodes (a label reading "PR #123") are left alone
    return (svg) => svg.replace(/<style[\s\S]*?<\/style>|<[^>]+>/g, recolour);
  }
  // Give the dark copy its own ids: the render id (which scopes its styles and marker urls) is
  // renamed, and every other element id (mermaid's node and edge ids) is prefixed, with its
  // url(#..) / href="#.." references, so the page never holds two elements with one id.
  function withId(svg, from, to) {
    svg = svg.replace(new RegExp(from + '(?![0-9])', 'g'), to);
    const ids = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((x) => !x.startsWith(to)));
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const x of ids) {
      svg = svg.replace(new RegExp(`(\\sid="|url\\(#|href="#)${esc(x)}(?=[")])`, 'g'), `$1${to}-${x}`);
    }
    return svg;
  }
  const api = { pairsFromCss, makeDarkener, withId, shade: (h) => hex(shade(parseHex(h))) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.nhDiagramDark = api;
})(this);
