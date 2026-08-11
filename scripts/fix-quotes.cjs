const fs = require("fs");
const locs = ["tr", "fr", "de", "es", "ru", "ja", "ko", "zh", "ar"];
for (const loc of locs) {
  const p = `scripts/i18n-${loc}.cjs`;
  let s = fs.readFileSync(p, "utf8");
  const before = s;
  s = s.replace(/: \\"\{name\}/g, ': "\\"{name}');
  if (s !== before) {
    fs.writeFileSync(p, s, "utf8");
    console.log(loc, "fixed");
  }
}
for (const l of locs) {
  require(`./i18n-${l}.cjs`);
}
console.log("ALL PARSE OK");
