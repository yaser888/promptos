const fs = require("fs");
const path = require("path");

const files = [
  "users", "prompts", "categories", "settings", "payments", "subscriptions",
].map((n) => path.join(__dirname, "..", "src", "app", "api", "admin", n, "route.ts"));

// Match any remaining "catch (error) {" blocks that return status 500
const catchRe = /catch \(error\) \{\s*console\.error\("([^"]+)", error\);\s*return NextResponse\.json\(\{ error: ("[^"]+") \}, \{ status: 500 \}\);\s*\}/g;

let found = false;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const before = src;
  src = src.replace(catchRe, (m, logMsg, respMsg) => {
    found = true;
    return `catch (error: any) {\n    console.error("${logMsg}", error);\n    const status = error?.status || 500;\n    const message = status === 401 || status === 403 ? error.message : ${respMsg};\n    return NextResponse.json({ error: message }, { status });\n  }`;
  });
  if (src !== before) {
    fs.writeFileSync(file, src, "utf8");
    console.log("OK:", path.basename(path.dirname(file)));
  }
}
if (!found) console.log("No remaining patterns found - already converted.");
