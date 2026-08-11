const fs = require("fs");
const path = require("path");

const files = [
  "users", "prompts", "categories", "settings", "payments", "stats", "subscriptions",
].map((n) => path.join(__dirname, "..", "src", "app", "api", "admin", n, "route.ts"));

const authImportRe = /^import \{ auth \} from "@clerk\/nextjs\/server";\s*$/m;

// Matches: const { userId } = await auth(); ... user lookup + role check (variants)
const authBlockRe = /const \{ userId \} = await auth\(\);\s*if \(!userId\) \{\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\s*\}\s*\n\s*const user = await prisma\.user\.findUnique\(\{ where: \{ clerkId: userId \} \}\);\s*if \(!user \|\| user\.role !== "ADMIN"\) \{\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\s*\}/g;

const authBlockReIndented = /    const \{ userId \} = await auth\(\);\s*    if \(!userId\) \{\s*      return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\s*    \}\s*\n\s*    const user = await prisma\.user\.findUnique\(\{ where: \{ clerkId: userId \} \}\);\s*    if \(!user \|\| user\.role !== "ADMIN"\) \{\s*      return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\s*    \}/g;

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const before = src;
  src = src.replace(authImportRe, 'import { requireAdmin } from "@/lib/server-auth";');
  src = src.replace(authBlockReIndented, "    await requireAdmin();");
  src = src.replace(authBlockRe, "    await requireAdmin();");
  if (src !== before) {
    fs.writeFileSync(file, src, "utf8");
    console.log("OK:", path.basename(path.dirname(file)));
  } else {
    console.log("NO CHANGE:", path.basename(path.dirname(file)));
  }
}
