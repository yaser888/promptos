const fs = require("fs");

const locales = ["tr", "fr", "de", "es", "ru", "ja", "ko", "zh"];
const junkTopLevel = [
  "blog", "overview", "users", "prompts", "categories", "sources", "imports",
  "subscriptions", "plans", "payments", "paymentMethods", "branding", "settings",
  "analytics", "collections", "favorites", "subscription",
];
const junkGenerator = [
  "signInToGenerate", "signInHint", "yourIdea", "signInRequired",
  "signInRequiredDesc", "generationFailed", "savedToLibrary",
  "savedToLibraryDesc", "saveFailed", "saved", "crafting",
  "resultWillAppear", "fillIdea",
];

for (const loc of locales) {
  const p = `src/messages/${loc}.json`;
  const m = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const k of junkTopLevel) delete m[k];
  if (m.generator) for (const k of junkGenerator) delete m.generator[k];
  fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
  console.log(`cleaned ${loc}:`, Object.keys(m).join(","));
}
