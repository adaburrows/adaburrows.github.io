// Recolours the greyscale logo: its black maps to one colour and its white to another, greys
// blend between the two by brightness; alpha is kept. Writes a PNG.
// usage: recolor-logo.cjs <src.png> <out.png> <colour for black> <colour for white>
// Dark mode (operator 2026-10-15): disc #f9774e (the river photo's sunset), lettering #000000.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [src, out, darkHex, lightHex] = process.argv.slice(2);
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgb = parse(darkHex), white = parse(lightHex);
  const b = await chromium.launch(); const page = await b.newPage();
  const dataUrl = await page.evaluate(async ([src, rgb, white]) => {
    const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const t = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 765; // 0 black .. 1 white
      for (let k = 0; k < 3; k++) d.data[i + k] = Math.round(rgb[k] * (1 - t) + white[k] * t);
    }
    x.putImageData(d, 0, 0);
    return c.toDataURL('image/png');
  }, ['data:image/png;base64,' + fs.readFileSync(src).toString('base64'), rgb, white]);
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await b.close(); console.log(out, fs.statSync(out).size, 'bytes');
})();
