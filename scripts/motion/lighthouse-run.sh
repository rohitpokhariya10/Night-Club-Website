#!/bin/zsh
# Lighthouse 13.6.0 on the production server: three mobile runs and one desktop run of the homepage, with a summary.
# usage: scripts/motion/lighthouse-run.sh <outDir> [url]
out=${1:?outDir}; url=${2:-http://localhost:3100/}
mkdir -p "$out"
for i in 1 2 3; do npx -y lighthouse@13.6.0 "$url" --quiet --chrome-flags="--headless=new" --output=json --output-path="$out/mobile-$i.json"; done
npx -y lighthouse@13.6.0 "$url" --quiet --preset=desktop --chrome-flags="--headless=new" --output=json --output-path="$out/desktop.json"
node -e '
const fs = require("fs"); const dir = process.argv[1];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
  const r = JSON.parse(fs.readFileSync(dir + "/" + f)); const c = r.categories, a = r.audits;
  const pct = k => c[k] ? Math.round(c[k].score * 100) : "-";
  console.log(f.padEnd(14), "perf", pct("performance"), "a11y", pct("accessibility"), "bp", pct("best-practices"), "seo", pct("seo"),
    "| LCP", a["largest-contentful-paint"].displayValue, "TBT", a["total-blocking-time"].displayValue, "CLS", a["cumulative-layout-shift"].displayValue,
    "FCP", a["first-contentful-paint"].displayValue, "| weight", Math.round(a["total-byte-weight"].numericValue / 1024) + " KB",
    "| seo fails:", Object.values(r.categories.seo?.auditRefs ?? []).map(x => a[x.id]).filter(x => x && x.score === 0).map(x => x.id).join(",") || "none");
}' "$out"
