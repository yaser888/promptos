const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const l = fs.readFileSync(process.cwd() + "/.env.local", "utf8").split(/\r?\n/).filter((x) => x.startsWith("DATABASE_URL=")).pop();
const url = l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
const p = new PrismaClient({ datasources: { db: { url } } });
p.user
  .count()
  .then((c) => { console.log("DB OK, users:", c); return p.$disconnect(); })
  .catch((e) => { console.log("DB FAIL:", e.message.split("\n")[0]); process.exit(1); });