const fs = require("fs");
const path = require("path");

const locales = ["en", "ar", "tr", "fr", "de", "es", "ru", "ja", "ko", "zh"];

function nest(flat, prefix) {
  const out = {};
  for (const [k, v] of Object.entries(flat)) {
    const full = prefix ? `${prefix}.${k}` : k;
    const parts = full.split(".");
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!node[p] || typeof node[p] !== "object") node[p] = {};
      node = node[p];
    }
    node[parts[parts.length - 1]] = v;
  }
  return out;
}

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== "object") target[k] = {};
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

const base = require("./i18n-en.cjs");
const enAdmin = nest(base.adminPages, "adminPages");
const enDash = nest(base.dashboardPages, "dashboardPages");
const enNav = clone(base.admin || {});

for (const loc of locales) {
  const file = `./i18n-${loc}.cjs`;
  const data = fs.existsSync(path.join(__dirname, file)) ? require(file) : {};
  const msgPath = path.join(__dirname, "..", "src", "messages", `${loc}.json`);
  const msg = JSON.parse(fs.readFileSync(msgPath, "utf8"));
  const baseCommon = clone(base.common);
  deepMerge(baseCommon, data.common || {});
  const nav = clone(enNav);
  deepMerge(nav, data.admin || {});
  const admin = clone(enAdmin);
  const dash = clone(enDash);
  deepMerge(admin, nest(data.adminPages || {}, "adminPages"));
  deepMerge(dash, nest(data.dashboardPages || {}, "dashboardPages"));
  deepMerge(msg.common, baseCommon);
  deepMerge(msg.adminPages || (msg.adminPages = {}), admin.adminPages);
  deepMerge(msg.dashboardPages || (msg.dashboardPages = {}), dash.dashboardPages);
  deepMerge(msg.adminPages.common || (msg.adminPages.common = {}), msg.common);
  deepMerge(msg.admin || (msg.admin = {}), nav);
  const baseMp = clone(base.maintenancePage || {});
  deepMerge(baseMp, data.maintenancePage || {});
  deepMerge(msg.maintenancePage || (msg.maintenancePage = {}), baseMp);
  const basePages = clone(base.pages || {});
  deepMerge(basePages, data.pages || {});
  deepMerge(msg.pages || (msg.pages = {}), basePages);
  const baseFooter = clone(base.footer || {});
  deepMerge(baseFooter, data.footer || {});
  deepMerge(msg.footer || (msg.footer = {}), baseFooter);
  const basePricing = clone(base.pricing || {});
  deepMerge(basePricing, data.pricing || {});
  deepMerge(msg.pricing || (msg.pricing = {}), basePricing);
  const baseHomeManager = clone(base.homeManager || {});
  deepMerge(baseHomeManager, data.homeManager || {});
  deepMerge(msg.homeManager || (msg.homeManager = {}), baseHomeManager);
  const baseSocialManager = clone(base.socialManager || {});
  deepMerge(baseSocialManager, data.socialManager || {});
  deepMerge(msg.socialManager || (msg.socialManager = {}), baseSocialManager);
  const baseContests = clone(base.contests || {});
  deepMerge(baseContests, data.contests || {});
  deepMerge(msg.contests || (msg.contests = {}), baseContests);
  const baseContestManager = clone(base.contestManager || {});
  deepMerge(baseContestManager, data.contestManager || {});
  deepMerge(msg.contestManager || (msg.contestManager = {}), baseContestManager);
  const baseNav = clone(base.nav || {});
  deepMerge(baseNav, data.nav || {});
  deepMerge(msg.nav || (msg.nav = {}), baseNav);
  const baseGamification = clone(base.gamification || {});
  deepMerge(baseGamification, data.gamification || {});
  deepMerge(msg.gamification || (msg.gamification = {}), baseGamification);
  const baseGamificationAdmin = clone(base.gamificationAdmin || {});
  deepMerge(baseGamificationAdmin, data.gamificationAdmin || {});
  deepMerge(msg.gamificationAdmin || (msg.gamificationAdmin = {}), baseGamificationAdmin);
  fs.writeFileSync(msgPath, JSON.stringify(msg, null, 2) + "\n");
  console.log(`merged ${loc}`);
}
