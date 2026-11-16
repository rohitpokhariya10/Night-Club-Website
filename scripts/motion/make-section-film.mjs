// Builds the "More than a night out" film: a nightlife-focused cut of the client-supplied Jimmy O's clip
// (public/videos/jimmy-os-hero-desktop.mp4, unchanged). Chromium plays each segment, draws every decoded
// frame to a canvas and MediaRecorder encodes H.264 MP4; WebP posters come from the edit's first frame.
// No ffmpeg needed. usage: node scripts/motion/make-section-film.mjs
import {chromium} from '@playwright/test';
import fs from 'node:fs';

// Served same-origin by the local Next server so the canvas stays exportable (file:// video taints it).
const origin = process.env.BASE_URL || 'http://localhost:3000';
const source = '/videos/jimmy-os-hero-desktop.mp4';
// Bar, guests and cocktails only: the daytime exterior (4.1–5.6 s) and food shots (10.45–11.3 s, 13.25 s–end)
// are left out. The last segment ends exactly where the first begins in the source, so the loop is seamless.
// Bitrate targets are about 2.6x the delivered rate: the real-time encoder delivers ~39% of the request.
const SEGMENTS = [[7.5, 10.42], [11.32, 13.22], [0, 4.05], [5.66, 7.46]];
const OUTPUTS = [
  {name: 'jimmy-os-nightlife-desktop.mp4', width: 1280, height: 720, bitrate: 7_000_000, poster: 'jimmy-os-nightlife-poster.webp'},
  {name: 'jimmy-os-nightlife-mobile.mp4', width: 640, height: 360, bitrate: 2_000_000, poster: 'jimmy-os-nightlife-poster-mobile.webp'},
];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${origin}/robots.txt`);
for (const out of OUTPUTS) {
  const result = await page.evaluate(async ({src, segments, out}) => {
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto'; video.src = src;
    await new Promise((ok, fail) => {video.onloadeddata = ok; video.onerror = () => fail(new Error('load ' + video.error?.code));});
    const canvas = document.createElement('canvas'); canvas.width = out.width; canvas.height = out.height;
    const ctx = canvas.getContext('2d', {alpha: false});
    ctx.imageSmoothingQuality = 'high';
    const track = canvas.captureStream(0).getVideoTracks()[0];
    const recorder = new MediaRecorder(new MediaStream([track]), {mimeType: 'video/mp4;codecs=avc1.640028', videoBitsPerSecond: out.bitrate});
    const chunks = [];
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    const seek = t => new Promise(ok => {video.onseeked = ok; video.currentTime = t;});
    let poster = null;
    let frames = 0;
    recorder.start(); recorder.pause();
    for (const [a, b] of segments) {
      await seek(a);
      ctx.drawImage(video, 0, 0, out.width, out.height);
      poster ??= canvas.toDataURL('image/webp', 0.86);
      recorder.resume();
      await new Promise(done => {
        const step = (_, meta) => {
          if (meta.mediaTime >= b) {video.pause(); done(); return;}
          ctx.drawImage(video, 0, 0, out.width, out.height);
          track.requestFrame(); frames++;
          video.requestVideoFrameCallback(step);
        };
        video.requestVideoFrameCallback(step);
        void video.play();
      });
      recorder.pause();
    }
    const stopped = new Promise(ok => {recorder.onstop = ok;});
    recorder.stop(); await stopped;
    const bytes = new Uint8Array(await new Blob(chunks, {type: 'video/mp4'}).arrayBuffer());
    let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return {video: btoa(binary), poster, frames};
  }, {src: source, segments: SEGMENTS, out});
  fs.writeFileSync(`apps/web/public/videos/${out.name}`, Buffer.from(result.video, 'base64'));
  fs.writeFileSync(`apps/web/public/images/${out.poster}`, Buffer.from(result.poster.split(',')[1], 'base64'));
  console.log(out.name, `${(fs.statSync(`apps/web/public/videos/${out.name}`).size / 1e6).toFixed(2)} MB`, result.frames, 'frames;', out.poster, `${(fs.statSync(`apps/web/public/images/${out.poster}`).size / 1e3).toFixed(0)} KB`);
}
await browser.close();
