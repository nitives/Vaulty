import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "..", ".."); // repo root
const web = path.join(root, "apps", "web");
const out = path.join(path.resolve(process.cwd()), "resources", "web"); // apps/desktop/resources/web

function rm(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function cpContents(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    fs.cpSync(path.join(src, entry), path.join(dest, entry), {
      recursive: true,
      force: true,
    });
  }
}

rm(out);
fs.mkdirSync(out, { recursive: true });

// Copy standalone server bundle to resources/web/.next/standalone
cpContents(
  path.join(web, ".next", "standalone"),
  path.join(out, ".next", "standalone"),
);

// Next standalone expects static files at .next/static
cpContents(path.join(web, ".next", "static"), path.join(out, ".next", "static"));

// Copy public assets
if (fs.existsSync(path.join(web, "public"))) {
  cpContents(path.join(web, "public"), path.join(out, "public"));
}

const expectedServerPath = path.join(out, ".next", "standalone", "server.js");
const nestedServerPath = path.join(
  out,
  ".next",
  "standalone",
  "apps",
  "web",
  "server.js",
);

// Next standalone in monorepos can place server.js in apps/web/server.js.
// Create a root entrypoint so Electron can always spawn ".next/standalone/server.js".
if (!fs.existsSync(expectedServerPath) && fs.existsSync(nestedServerPath)) {
  fs.writeFileSync(
    expectedServerPath,
    "require('./apps/web/server.js');\n",
    "utf8",
  );
}

if (!fs.existsSync(expectedServerPath)) {
  throw new Error(`Expected standalone server at: ${expectedServerPath}`);
}

console.log("Copied Next standalone build to:", out);
