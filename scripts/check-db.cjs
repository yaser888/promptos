const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const models = ["user", "prompt", "category", "discountCode", "subscription", "usageEvent", "favorite", "comment", "rating", "notification", "setting"];
  for (const m of models) {
    try {
      const count = await p[m].count();
      console.log(`${m}: ${count}`);
    } catch (e) {
      console.log(`${m}: ERROR - ${e.message.slice(0, 100)}`);
    }
  }
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
