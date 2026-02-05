import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "..", ".."); // repo root
const web = path.join(root, "apps", "web");
const out = path.join(path.resolve(process.cwd()), "resources", "web"); // apps/desktop/resources/web

function rm(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function cp(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

rm(out);
fs.mkdirSync(out, { recursive: true });

// Copy standalone server bundle
cp(path.join(web, ".next", "standalone"), out);

// Next standalone expects static files at .next/static
cp(path.join(web, ".next", "static"), path.join(out, ".next", "static"));

// Copy public (if you use it)
if (fs.existsSync(path.join(web, "public"))) {
  cp(path.join(web, "public"), path.join(out, "public"));
}

console.log("✅ Copied Next standalone build to:", out);
