import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repository = process.env.RPG_SHARED_REPO ?? "0biWanKenobi/rpg_shared";
const release = process.env.RPG_SHARED_RELEASE ?? "latest";
const cacheRoot = process.env.CF_PAGES_CACHE_DIR ?? ".cf-pages-cache";
const cacheDir = path.join(cacheRoot, "rpg_shared");
const packageDir = path.join(".yalc", "rpg_shared");
const releaseRef = release === "latest"
  ? "latest"
  : `tags/${release.startsWith("v") ? release : `v${release}`}`;

const response = await fetch(
  `https://api.github.com/repos/${repository}/releases/${releaseRef}`,
  { headers: { Accept: "application/vnd.github+json" } },
);

if (!response.ok) {
  throw new Error(`GitHub release request failed: ${response.status} ${response.statusText}`);
}

const releaseData = await response.json();
const releaseTag = releaseData.tag_name;
const asset = releaseData.assets?.find(({ name }) => name.endsWith(".tgz"));

if (!releaseTag || !asset?.browser_download_url) {
  throw new Error(`Release ${release} has no .tgz asset`);
}

await mkdir(cacheDir, { recursive: true });
await mkdir(path.dirname(packageDir), { recursive: true });

const archive = path.join(cacheDir, `${releaseTag}.tgz`);
const versionFile = path.join(cacheDir, "version");
const cachedVersion = await readFile(versionFile, "utf8").catch(() => "");

if (cachedVersion !== releaseTag || !(await fileExists(archive))) {
  for (const filename of await readdir(cacheDir)) {
    if (filename.endsWith(".tgz")) {
      await rm(path.join(cacheDir, filename));
    }
  }

  const assetResponse = await fetch(asset.browser_download_url);
  if (!assetResponse.ok) {
    throw new Error(`Release asset download failed: ${assetResponse.status} ${assetResponse.statusText}`);
  }

  await writeFile(archive, Buffer.from(await assetResponse.arrayBuffer()));
  await writeFile(versionFile, releaseTag);
  console.log(`Downloaded rpg_shared ${releaseTag}`);
} else {
  console.log(`Reusing cached rpg_shared ${releaseTag}`);
}

await rm(packageDir, { recursive: true, force: true });
await mkdir(packageDir, { recursive: true });
execFileSync("tar", ["-xzf", archive, "-C", packageDir, "--strip-components=1"], {
  stdio: "inherit",
});

const manifestPath = path.join(packageDir, "package.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
delete manifest.devDependencies;
delete manifest.engines;
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

async function fileExists(filename) {
  try {
    await access(filename);
    return true;
  } catch {
    return false;
  }
}
