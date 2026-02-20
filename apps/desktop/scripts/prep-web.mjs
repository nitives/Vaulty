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
      dereference: true,
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

const staticSrc = path.join(web, ".next", "static");
const publicSrc = path.join(web, "public");
const rootStaticDest = path.join(out, ".next", "static");
const nestedStaticDest = path.join(
  out,
  ".next",
  "standalone",
  "apps",
  "web",
  ".next",
  "static",
);
const rootPublicDest = path.join(out, "public");
const nestedPublicDest = path.join(
  out,
  ".next",
  "standalone",
  "apps",
  "web",
  "public",
);

// Keep static assets in both locations:
// - root path for simple standalone layouts
// - nested apps/web path for monorepo standalone output
cpContents(staticSrc, rootStaticDest);
cpContents(staticSrc, nestedStaticDest);

// Copy public assets
if (fs.existsSync(publicSrc)) {
  cpContents(publicSrc, rootPublicDest);
  cpContents(publicSrc, nestedPublicDest);
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
