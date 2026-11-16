// Reference recon: what libraries drive motion on the reference site, and how is the page structured?
import {chromium} from '@playwright/test';
import fs from 'node:fs';
const out = 'artifacts/delta-reference';
const browser = await chromium.launch({headless: false});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const scripts = [];
page.on('response', r => { const u = r.url(); if (/\.js(\?|$)/.test(u)) scripts.push(u); });
await page.goto('https://deltacafes.com/en', {waitUntil: 'domcontentloaded', timeout: 60000});
for (const t of [0, 300, 700, 1200, 2000, 3500, 6000]) {
  await page.waitForTimeout(t === 0 ? 0 : t - (globalThis.last || 0)); globalThis.last = t;
  await page.screenshot({path: `${out}/recon-load-${String(t).padStart(4, '0')}ms.png`});
}
const info = await page.evaluate(() => {
  const w = window;
  const st = w.ScrollTrigger || w.gsap?.plugins?.scrollTrigger || null;
  const triggers = st?.getAll ? st.getAll().map(t => ({
    id: t.vars.id, trigger: t.trigger && (t.trigger.id || t.trigger.className?.toString().slice(0, 80) || t.trigger.tagName),
    start: t.start, end: t.end, pin: !!t.pin, pinSpacing: t.vars.pinSpacing, scrub: t.vars.scrub, toggleActions: t.vars.toggleActions,
    once: t.vars.once, snap: !!t.vars.snap, startVar: String(t.vars.start ?? ''), endVar: String(t.vars.end ?? ''),
    anim: t.animation ? {dur: t.animation.duration?.(), targets: (t.animation.getChildren ? t.animation.getChildren(true, true, false).slice(0, 6).flatMap(c => c.targets?.() || []).map(el => el.className?.toString?.().slice(0, 50) || el.tagName) : (t.animation.targets?.() || []).slice(0, 4).map(el => el.className?.toString?.().slice(0, 50)))} : null,
  })) : null;
  return {
    gsap: w.gsap?.version || null, scrollTriggerGlobal: !!w.ScrollTrigger, triggers,
    lenis: !!(w.lenis || w.Lenis || document.documentElement.classList.contains('lenis')), htmlClass: document.documentElement.className,
    bodyClass: document.body.className, nuxt: !!w.__NUXT__ || !!w.$nuxt, next: !!w.__NEXT_DATA__, locomotive: !!document.querySelector('[data-scroll-container]'),
    swiper: !!w.Swiper || !!document.querySelector('.swiper'), barba: !!w.barba, three: !!w.THREE, webgl: document.querySelectorAll('canvas').length,
    scrollHeight: document.documentElement.scrollHeight, overflowBody: getComputedStyle(document.body).overflow, overflowHtml: getComputedStyle(document.documentElement).overflow,
    generator: document.querySelector('meta[name=generator]')?.content,
    sections: [...document.querySelectorAll('main > *, main section, [class*=section]')].slice(0, 60).map(s => {const r = s.getBoundingClientRect(); return {tag: s.tagName, cls: s.className?.toString().slice(0, 90), top: Math.round(r.top + scrollY), h: Math.round(r.height)};}),
    videos: [...document.querySelectorAll('video')].map(v => ({src: v.currentSrc?.slice(0, 120), auto: v.autoplay, loop: v.loop})),
    stickies: [...document.querySelectorAll('*')].filter(e => {const p = getComputedStyle(e).position; return p === 'sticky' || p === 'fixed';}).slice(0, 30).map(e => ({tag: e.tagName, cls: e.className?.toString().slice(0, 80), pos: getComputedStyle(e).position})),
    cookie: [...document.querySelectorAll('button')].filter(b => /accept|aceitar|agree|allow/i.test(b.textContent || '')).map(b => b.textContent.trim().slice(0, 40)),
  };
});
fs.writeFileSync(`${out}/recon.json`, JSON.stringify({info, scripts: [...new Set(scripts)]}, null, 2));
console.log(JSON.stringify({...info, sections: info.sections.length, stickies: info.stickies, triggers: info.triggers?.length}, null, 1).slice(0, 4000));
console.log('scripts:', [...new Set(scripts)].map(s => s.split('?')[0].slice(-90)).join('\n'));
await browser.close();
