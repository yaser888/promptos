const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_PLANS = [
  {
    key: "FREE",
    name: "Free",
    description: "Basic access to the prompt library",
    price: 0,
    period: "monthly",
    isDefault: true,
    sortOrder: 0,
    features: [
      "limited_prompts",
      "basic_library",
      "save_prompts",
      "copy_share",
      "two_languages",
      "basic_sync",
      "contest_entries",
      "community_voting",
    ],
  },
  {
    key: "PRO",
    name: "Pro",
    description: "For power users who want everything",
    price: 10,
    period: "monthly",
    sortOrder: 1,
    features: [
      "unlimited_prompts",
      "all_tools",
      "all_templates",
      "all_languages",
      "full_sync",
      "all_exports",
      "version_history",
      "ai_optimizer",
      "ai_analyzer",
      "priority_support",
      "prompt_insights",
      "marketplace_selling",
    ],
  },
  {
    key: "TEAM",
    name: "Team",
    description: "For teams that work together",
    price: 25,
    period: "monthly",
    sortOrder: 2,
    features: [
      "unlimited_prompts",
      "all_tools",
      "all_templates",
      "all_languages",
      "full_sync",
      "all_exports",
      "version_history",
      "ai_optimizer",
      "ai_analyzer",
      "priority_support",
      "workspaces",
      "project_sharing",
      "permissions",
      "team_analytics",
      "activity_log",
      "admin_dashboard",
      "prompt_insights",
      "marketplace_selling",
    ],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    price: 0,
    period: "custom",
    sortOrder: 3,
    features: [
      "unlimited_prompts",
      "all_tools",
      "all_templates",
      "all_languages",
      "full_sync",
      "all_exports",
      "version_history",
      "ai_optimizer",
      "ai_analyzer",
      "priority_support",
      "workspaces",
      "project_sharing",
      "permissions",
      "team_analytics",
      "activity_log",
      "admin_dashboard",
      "custom_api",
      "dedicated_hosting",
      "sso",
      "dedicated_support",
      "account_manager",
      "advanced_security",
      "sla",
    ],
  },
];

async function main() {
  for (const plan of DEFAULT_PLANS) {
    const existing = await prisma.plan.findUnique({
      where: { key: plan.key },
      include: { features: true },
    });

    if (existing) {
      await prisma.plan.update({
        where: { id: existing.id },
        data: {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          period: plan.period,
          isDefault: plan.isDefault || false,
          sortOrder: plan.sortOrder,
        },
      });
      await prisma.planFeature.deleteMany({ where: { planId: existing.id } });
      await prisma.planFeature.createMany({
        data: plan.features.map((name, i) => ({
          planId: existing.id,
          name,
          sortOrder: i,
        })),
      });
      console.log(`Updated plan ${plan.key} (${plan.features.length} features)`);
    } else {
      const created = await prisma.plan.create({
        data: {
          key: plan.key,
          name: plan.name,
          description: plan.description,
          price: plan.price,
          period: plan.period,
          isDefault: plan.isDefault || false,
          sortOrder: plan.sortOrder,
          features: {
            create: plan.features.map((name, i) => ({
              name,
              sortOrder: i,
            })),
          },
        },
      });
      console.log(`Created plan ${plan.key} (${created.id})`);
    }
  }

  const count = await prisma.plan.count();
  console.log(`Total plans in DB: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
