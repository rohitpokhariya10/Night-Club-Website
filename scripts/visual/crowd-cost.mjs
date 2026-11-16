// Crowd draw-submission cost, committed renderer (git HEAD) vs working tree, in headless Chromium at DPR 1.
// Measures only the time to issue the Canvas calls for one paint (both canvases); excludes rasterization and
// compositing, so it is a relative comparison, not a device FPS claim. The working-tree run includes five beams.
// usage: node scripts/visual/crowd-cost.mjs <out.json>
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {chromium} from '@playwright/test';
const file = 'apps/web/src/lib/motion/crowd.ts';
const compile = source => ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}}).outputText;
const versions = {before: compile(execFileSync('git', ['show', `HEAD:${file}`], {encoding: 'utf8'})), after: compile(fs.readFileSync(file, 'utf8'))};
const browser = await chromium.launch();
const page = await browser.newPage();
const samples = await page.evaluate(({versions}) => {
  const rows = [];
  for (const [label, code] of Object.entries(versions)) for (const mobile of [false, true]) {
    let tick;
    const ticker = {add: f => {tick = f;}, remove: () => {}};
    const exports = {};
    new Function('exports', 'require', code)(exports, () => ({__esModule: true, default: {ticker}, ticker}));
    const width = mobile ? 390 : 1440, height = (mobile ? 844 : 900) * (mobile ? 0.49 : 0.55);
    const host = document.createElement('div');
    host.style.cssText = `position:absolute;width:${width}px;height:${height}px`;
    host.innerHTML = '<canvas></canvas><canvas></canvas>'; document.body.append(host);
    const crowd = exports.createCrowd(host, {mobile});
    if (label === 'after') crowd.lights = [[0.14, -16, 7, [146, 176, 196], 0.58], [0.31, -7, 5, [232, 150, 104], 0.78], [0.47, 4, 3.5, [246, 206, 160], 0.7], [0.63, -5, 5.25, [228, 100, 72], 0.72], [0.84, 15, 7.5, [232, 150, 104], 0.78]]
      .map(([x, angle, half, color, strength]) => ({x, angle, half, color, strength}));
    crowd.start();
    const times = [];
    for (let i = 0; i < 400; i++) {const start = performance.now(); tick(i / (mobile ? 30 : 60)); if (i > 40) times.push(performance.now() - start);}
    times.sort((a, b) => a - b);
    rows.push({label, width, medianMs: +times[Math.floor(times.length * 0.5)].toFixed(3), p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(3)});
    crowd.destroy(); host.remove();
  }
  return rows;
}, {versions});
fs.writeFileSync(process.argv[2], JSON.stringify({note: 'Chromium Canvas draw-submission time per paint (both canvases), DPR 1; excludes rasterization/compositing. Relative comparison only, not a device FPS measurement.', samples}, null, 2));
console.log(JSON.stringify(samples));
await browser.close();
