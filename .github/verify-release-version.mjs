import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const tag = process.env.GITHUB_REF_NAME || process.argv[2];

if (!tag || !/^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new Error(
    `Expected a semantic version tag such as v1.0.5, received: ${tag || "(none)"}`,
  );
}

const expectedVersion = tag.slice(1);
const desktopPackage = readJson("apps/desktop/package.json");
const webPackage = readJson("apps/web/package.json");
const packageLock = readJson("package-lock.json");

const versions = new Map([
  ["apps/desktop/package.json", desktopPackage.version],
  ["apps/web/package.json", webPackage.version],
  [
    "package-lock.json (apps/desktop)",
    packageLock.packages?.["apps/desktop"]?.version,
  ],
  [
    "package-lock.json (apps/web)",
    packageLock.packages?.["apps/web"]?.version,
  ],
]);

const mismatches = [...versions].filter(
  ([, version]) => version !== expectedVersion,
);

if (mismatches.length > 0) {
  const details = mismatches
    .map(([source, version]) => `${source}: ${version || "(missing)"}`)
    .join("\n");
  throw new Error(
    `Tag ${tag} does not match every release version (${expectedVersion}):\n${details}`,
  );
}

console.log(`Release tag ${tag} matches every package version.`);

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8"),
  );
}
