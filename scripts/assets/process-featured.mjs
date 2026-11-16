// Art-directs the Signature Selections photographs (decoded and re-encoded in Chromium, no extra tools):
// a per-image crop that centres the dish and a gentle grade (contrast, saturation). Plates with a clean rim are
// cut out along that rim (a measured ellipse, lightly feathered) into a transparent WebP, so they become isolated
// objects like the reference's bowl; the others keep their surroundings, sunk into the page's near-black with a
// wide radial falloff. Writes to apps/web/public/media/featured/. Sources and licences: ASSET-MANIFEST.md in that folder.
// usage: node scripts/assets/process-featured.mjs
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const OUT = 'apps/web/public/media/featured';
/** crop: fractions of the source; fall: where the darkening begins; cut: the plate rim as an ellipse in fractions of the output (cx, cy, rx, ry, degrees). */
const JOBS = [
  {id: 'classic-burger', src: 'apps/web/public/images/burger.jpg', crop: [0, 0.04, 1, 0.96], width: 800, fall: 0.62, grade: 'contrast(1.06) saturate(1.06)'},
  {id: 'loaded-nachos', src: 'artifacts/signature-rebuild/originals/029.jpg', crop: [0.0, 0.06, 1, 0.94], width: 2400, fall: 0.6, grade: 'contrast(1.08) saturate(1.1) brightness(1.02)', cut: {cx: 0.503, cy: 0.522, rx: 0.488, ry: 0.408, rotate: -2.5}},
  {id: 'house-wings', src: 'artifacts/signature-rebuild/originals/064.jpg', crop: [0.0, 0.1, 0.96, 0.9], width: 2600, fall: 0.6, grade: 'contrast(1.06) saturate(1.06) brightness(1.03)', cut: {cx: 0.489, cy: 0.516, rx: 0.461, ry: 0.456, rotate: 0}},
  {id: 'cocktail-pitchers', src: 'artifacts/signature-rebuild/originals/088.jpg', crop: [0.04, 0.16, 0.94, 0.72], width: 2200, fall: 0.5, grade: 'contrast(1.08) saturate(1.04) brightness(0.98)'},
];
fs.mkdirSync(OUT, {recursive: true});
const browser = await chromium.launch();
const page = await browser.newPage();
for (const job of JOBS) {
  const data = `data:image/jpeg;base64,${fs.readFileSync(job.src).toString('base64')}`;
  const result = await page.evaluate(async ({data, job}) => {
    const img = await new Promise((ok, fail) => {const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = data;});
    const [x, y, w, h] = [job.crop[0] * img.width, job.crop[1] * img.height, job.crop[2] * img.width, job.crop[3] * img.height];
    const width = Math.min(job.width, Math.round(w));
    const height = Math.round(width * h / w);
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.filter = job.grade; g.drawImage(img, x, y, w, h, 0, 0, width, height); g.filter = 'none';
    if (job.cut) {
      // Keep only the plate: an ellipse along its rim, feathered by ~0.15% of the width (no halo).
      const m = document.createElement('canvas'); m.width = width; m.height = height;
      const mg = m.getContext('2d'); mg.filter = `blur(${Math.max(1.5, width * 0.0015)}px)`; mg.fillStyle = '#000';
      mg.beginPath(); mg.ellipse(job.cut.cx * width, job.cut.cy * height, job.cut.rx * width, job.cut.ry * height, job.cut.rotate * Math.PI / 180, 0, Math.PI * 2); mg.fill();
      g.globalCompositeOperation = 'destination-in'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-over';
      return {data: c.toDataURL('image/webp', 0.9).split(',')[1], width, height, ext: 'webp'};
    }
    // Sink the surroundings into the page colour (#090910) with a long, soft falloff (no visible edge).
    const r = Math.hypot(width, height) / 2;
    const fall = g.createRadialGradient(width / 2, height / 2, r * job.fall * 0.62, width / 2, height / 2, r);
    fall.addColorStop(0, 'rgba(9,9,16,0)'); fall.addColorStop(0.55, 'rgba(9,9,16,0.42)'); fall.addColorStop(1, 'rgba(9,9,16,0.9)');
    g.fillStyle = fall; g.fillRect(0, 0, width, height);
    return {data: c.toDataURL('image/jpeg', 0.88).split(',')[1], width, height, ext: 'jpg'};
  }, {data, job});
  const file = `${OUT}/${job.id}.${result.ext}`;
  fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  console.log(job.id, `${result.width}×${result.height}`, result.ext, `${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}
await browser.close();
