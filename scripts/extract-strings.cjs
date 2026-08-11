const fs = require("fs");
const path = require("path");
const dirs = ["admin", "dashboard"];
const files = [];
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (f.name.endsWith(".tsx")) files.push(p);
  }
}
for (const d of dirs) walk("src/app/[locale]/" + d);
files.push("src/components/dashboard/overview.tsx");
files.push("src/components/dashboard/stats-card.tsx");
const out = {};
for (const f of files) {
  const c = fs.readFileSync(f, "utf8");
  const set = new Set();
  for (const m of c.matchAll(/[>(\"']\s*([A-Z][A-Za-z0-9 ,.'&():\/?!-]{4,})\s*[<)\"']/g)) {
    const s = m[1].trim();
    if (!/[{}]/.test(s) && !s.startsWith('"use')) set.add(s);
  }
  for (const m of c.matchAll(/(?:label|placeholder|title|description)=\"([A-Za-z][^\"]{2,})\"/g)) set.add(m[1]);
  out[f] = [...set].sort();
}
const map = new Map();
for (const [f, arr] of Object.entries(out)) {
  for (const s of arr) map.set(s, (map.get(s) || []).concat([f]));
}
console.log("TOTAL UNIQUE STRINGS:", map.size);
console.log("=== ALL STRINGS WITH FILE COUNTS ===");
for (const [s, fsArr] of [...map].sort()) {
  console.log(JSON.stringify(s) + " | " + fsArr.length + " | " + fsArr.map((x) => x.split("\\").pop()).join(","));
}
