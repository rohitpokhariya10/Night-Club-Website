// Takes a heap snapshot after repeated client navigation and prints retainer chains of detached DOM nodes.
// usage: ROUTES=/,/events node scripts/motion/leak-retainers.mjs
import {chromium} from '@playwright/test';
const [a, b] = (process.env.ROUTES || '/,/events').split(',');
const browser = await chromium.launch(); const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const cdp = await page.context().newCDPSession(page);
await page.goto((process.env.BASE_URL || 'http://localhost:3100') + a); await page.waitForTimeout(1500);
const go = async path => { await page.locator(`header a[href="${path}"]`).first().click(); await page.waitForURL(u => new URL(u).pathname === path); await page.waitForTimeout(600); };
for (let i = 0; i < 4; i++) { await go(b); await go(a); }
await go(b);
await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage');
let chunks = []; cdp.on('HeapProfiler.addHeapSnapshotChunk', e => chunks.push(e.chunk));
await cdp.send('HeapProfiler.takeHeapSnapshot', {reportProgress: false, treatGlobalObjectsAsRoots: true});
const snap = JSON.parse(chunks.join('')); chunks = null;
const {node_fields: nf, edge_fields: ef, node_types: [nodeTypes], edge_types: [edgeTypes]} = snap.snapshot.meta;
const N = nf.length, E = ef.length, nodes = snap.nodes, edges = snap.edges, str = snap.strings;
const iName = nf.indexOf('name'), iType = nf.indexOf('type'), iEdgeCount = nf.indexOf('edge_count'), iDet = nf.indexOf('detachedness');
const eType = ef.indexOf('type'), eName = ef.indexOf('name_or_index'), eTo = ef.indexOf('to_node');
const count = nodes.length / N; const firstEdge = new Uint32Array(count + 1);
for (let i = 0, e = 0; i < count; i++) { firstEdge[i] = e; e += nodes[i * N + iEdgeCount] * E; } firstEdge[count] = edges.length;
const retainers = Array.from({length: count}, () => []);
for (let i = 0; i < count; i++) for (let e = firstEdge[i]; e < firstEdge[i + 1]; e += E) {
  const t = edgeTypes[edges[e + eType]]; if (t === 'weak' || t === 'shortcut') continue;
  retainers[edges[e + eTo] / N].push([i, t === 'element' || t === 'hidden' ? `[${edges[e + eName]}]` : str[edges[e + eName]]]);
}
const name = i => str[nodes[i * N + iName]]; const type = i => nodeTypes[nodes[i * N + iType]];
const detached = []; for (let i = 0; i < count; i++) if ((iDet >= 0 && nodes[i * N + iDet] === 2 && type(i) === 'native') || name(i).startsWith('Detached ')) detached.push(i);
console.log('detached native nodes:', detached.length);
const hist = new Map(); detached.forEach(i => hist.set(name(i).slice(0, 50), (hist.get(name(i).slice(0, 50)) || 0) + 1)); console.log([...hist].sort((x, y) => y[1] - x[1]).slice(0, 12));
{
  // Forward BFS from the snapshot root over strong edges; print the path that keeps a detached <main> alive.
  const parent = new Int32Array(count).fill(-1); const via = new Array(count); parent[0] = 0; const q = [0];
  for (let h = 0; h < q.length; h++) { const cur = q[h]; for (let e = firstEdge[cur]; e < firstEdge[cur + 1]; e += E) {
    const t = edgeTypes[edges[e + eType]]; if (t === 'weak' || t === 'shortcut') continue; const to = edges[e + eTo] / N;
    if (parent[to] !== -1) continue; parent[to] = cur; via[to] = t === 'element' || t === 'hidden' ? `[${edges[e + eName]}]` : String(str[edges[e + eName]]); q.push(to); } }
  const mains = detached.filter(i => name(i).startsWith('<main')); console.log('detached <main> reachable:', mains.filter(i => parent[i] !== -1).length, 'of', mains.length);
  for (const m of mains.slice(0, 2)) { const path = []; for (let c = m; c !== 0 && parent[c] !== -1 && path.length < 40; c = parent[c]) path.push(`${type(c)}:${name(c).slice(0, 60)} (via .${via[c]})`); console.log('\nPATH (target first):\n  ' + path.join('\n  ')); }
}
if (process.env.RAW) {
  const sample = detached.filter(i => /section|h2|HTMLSection|HTMLHeading/i.test(name(i))).slice(0, 2);
  const show = (i, depth, seen = new Set()) => { if (depth > 4 || seen.has(i)) return; seen.add(i); for (const [r, edge] of retainers[i].slice(0, 6)) { console.log('  '.repeat(depth) + `<- .${edge} ${type(r)}:${name(r).slice(0, 70)}`); show(r, depth + 1, seen); } };
  for (const i of sample) { console.log('\n' + name(i)); show(i, 1); }
}
// For a few detached elements, print the shortest retainer path up to a GC root / Window.
let shown = 0; const seenPaths = new Map();
for (const start of detached.filter(i => /HTML(Section|Div|Span|Heading|Paragraph|Image)/.test(name(i))).slice(0, 300)) {
  const prev = new Map([[start, null]]); const queue = [start]; let found = null;
  while (queue.length && !found) {
    const cur = queue.shift();
    for (const [r, edge] of retainers[cur]) {
      if (prev.has(r)) continue; prev.set(r, [cur, edge]);
      if (type(r) === 'synthetic' || /^Window/.test(name(r))) { found = r; break; }
      if (prev.size < 60000) queue.push(r);
    }
  }
  if (!found) continue;
  const chain = []; let cur = found; while (cur !== start && prev.get(cur)) { const [child, edge] = prev.get(cur); chain.push(`${type(cur)}:${name(cur).slice(0, 48)} .${edge}`); cur = child; }
  chain.push(name(start));
  const key = chain.filter(c => !/^(native|hidden|array):\(|InternalNode|system \//.test(c)).slice(0, 9).join('  →  ');
  seenPaths.set(key, (seenPaths.get(key) || 0) + 1);
}
[...seenPaths.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5).forEach(([k, v]) => console.log(`\n${v} ×`, k));
await browser.close();
