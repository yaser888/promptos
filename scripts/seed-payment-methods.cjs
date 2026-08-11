const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const methods = [
  {
    name: "Stripe",
    code: "stripe",
    description: "Credit and debit card payments via Stripe",
    icon: "💳",
    config: { apiKey: "", webhookSecret: "" },
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "PayPal",
    code: "paypal",
    description: "Pay with a PayPal account or linked card",
    icon: "🅿️",
    config: { clientId: "", clientSecret: "" },
    isActive: false,
    sortOrder: 2,
  },
  {
    name: "Bank Transfer",
    code: "bank_transfer",
    description: "Direct bank transfer with manual confirmation",
    icon: "🏦",
    config: { bankName: "", accountName: "", accountNumber: "", iban: "", swift: "" },
    isActive: false,
    sortOrder: 3,
  },
  {
    name: "Cash on Delivery",
    code: "cod",
    description: "Pay in cash upon delivery",
    icon: "💵",
    config: {},
    isActive: false,
    sortOrder: 4,
  },
];

async function main() {
  for (const m of methods) {
    const existing = await prisma.paymentMethod.findUnique({ where: { code: m.code } });
    if (existing) {
      await prisma.paymentMethod.update({
        where: { code: m.code },
        data: { name: m.name, description: m.description, icon: m.icon, sortOrder: m.sortOrder },
      });
      console.log(`updated: ${m.code}`);
    } else {
      await prisma.paymentMethod.create({ data: m });
      console.log(`created: ${m.code}`);
    }
  }
  const total = await prisma.paymentMethod.count();
  console.log(`Total payment methods: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
