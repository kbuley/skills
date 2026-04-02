#!/usr/bin/env node

"use strict";

const path = require("path");
const fs = require("fs");

function resolveSafeRealPath(rootDir, symlinkPath) {
  try {
    const realPath = fs.realpathSync(symlinkPath);
    const resolvedRoot = fs.realpathSync(rootDir);
    const relative = path.relative(resolvedRoot, realPath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
    return realPath;
  } catch {
    return null;
  }
}

const NAMESPACE = "kbuley";
const INSTALL_MANIFEST_FILE = ".kbuley-install-manifest.json";
const SKILLS_SRC = path.join(__dirname, "..", "skills");

const isWindows = process.platform === "win32";
const HOME = process.env.HOME || process.env.USERPROFILE || "";

function resolveDir(p) {
  if (!p) return null;
  return path.resolve(p.replace(/^~($|\/)/, HOME + "$1"));
}

function parseArgs() {
  const a = process.argv.slice(2);
  let pathArg = null;
  let cursor = false,
    claude = false,
    gemini = false,
    codex = false,
    kiro = false,
    copilot = false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--help" || a[i] === "-h") return { help: true };
    if (a[i] === "--path" && a[i + 1]) { pathArg = a[++i]; continue; }
    if (a[i] === "--cursor")  { cursor = true;  continue; }
    if (a[i] === "--claude")  { claude = true;   continue; }
    if (a[i] === "--gemini")  { gemini = true;   continue; }
    if (a[i] === "--codex")   { codex = true;    continue; }
    if (a[i] === "--kiro")    { kiro = true;     continue; }
    if (a[i] === "--copilot") { copilot = true;  continue; }
    if (a[i] === "install") continue;
  }

  return { pathArg, cursor, claude, gemini, codex, kiro, copilot };
}

function getCopilotBase() {
  if (isWindows) {
    return path.join(process.env.USERPROFILE || HOME, ".copilot", "skills");
  }
  return path.join(HOME, ".copilot", "skills");
}

function getTargets(opts) {
  if (opts.pathArg) {
    return [{ name: "Custom", path: resolveDir(opts.pathArg) }];
  }

  const targets = [];

  if (opts.cursor) {
    targets.push({ name: "Cursor", path: path.join(HOME, ".cursor", "skills", NAMESPACE) });
  }
  if (opts.claude) {
    targets.push({ name: "Claude Code", path: path.join(HOME, ".claude", "skills", NAMESPACE) });
  }
  if (opts.gemini) {
    targets.push({ name: "Gemini CLI", path: path.join(HOME, ".gemini", "skills", NAMESPACE) });
  }
  if (opts.codex) {
    const codexBase = process.env.CODEX_HOME
      ? path.join(process.env.CODEX_HOME, "skills")
      : path.join(HOME, ".codex", "skills");
    targets.push({ name: "Codex CLI", path: path.join(codexBase, NAMESPACE) });
  }
  if (opts.kiro) {
    targets.push({ name: "Kiro", path: path.join(HOME, ".kiro", "skills", NAMESPACE) });
  }
  if (opts.copilot) {
    targets.push({ name: "Copilot", path: path.join(getCopilotBase(), NAMESPACE) });
  }

  // Default: Claude Code
  if (targets.length === 0) {
    targets.push({ name: "Claude Code", path: path.join(HOME, ".claude", "skills", NAMESPACE) });
  }

  return targets;
}

function printHelp() {
  console.log(`
@kbuley/skills — AI agent skills installer

  npx @kbuley/skills [install] [options]

  Installs skills into the kbuley/ namespace inside your agent's skills directory.

Options:
  --claude       Install to ~/.claude/skills/kbuley/ (default)
  --cursor       Install to ~/.cursor/skills/kbuley/
  --gemini       Install to ~/.gemini/skills/kbuley/
  --codex        Install to ~/.codex/skills/kbuley/
  --kiro         Install to ~/.kiro/skills/kbuley/
  --copilot      Install to ~/.copilot/skills/kbuley/
                 (Windows: %USERPROFILE%\\.copilot\\skills\\kbuley-skills\\)
  --path <dir>   Install to <dir> (no namespace applied)
  --help, -h     Show this help message

Examples:
  npx @kbuley/skills                        Install to Claude Code (default)
  npx @kbuley/skills --claude               Install to Claude Code
  npx @kbuley/skills --cursor               Install to Cursor
  npx @kbuley/skills --copilot              Install to Copilot
  npx @kbuley/skills --claude --copilot     Install to multiple targets
  npx @kbuley/skills --path ./my-skills     Install to custom directory
`);
}

function copyRecursiveSync(src, dest, rootDir = src) {
  const stats = fs.lstatSync(src);
  const resolvedSource = stats.isSymbolicLink()
    ? resolveSafeRealPath(rootDir, src)
    : src;

  if (!resolvedSource) {
    console.warn(`  Skipping symlink outside skills root: ${src}`);
    return;
  }

  const resolvedStats = fs.statSync(resolvedSource);
  if (resolvedStats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(resolvedSource).forEach((child) => {
      copyRecursiveSync(
        path.join(resolvedSource, child),
        path.join(dest, child),
        rootDir
      );
    });
  } else {
    fs.copyFileSync(resolvedSource, dest);
  }
}

function getInstallEntries() {
  if (!fs.existsSync(SKILLS_SRC)) {
    console.error(`Skills source directory not found: ${SKILLS_SRC}`);
    process.exit(1);
  }
  return fs.readdirSync(SKILLS_SRC).filter((f) => f !== ".gitkeep");
}

function readInstallManifest(targetPath) {
  const manifestPath = path.join(targetPath, INSTALL_MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!parsed || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.filter((e) => typeof e === "string");
  } catch {
    console.warn(`  Ignoring invalid install manifest at ${manifestPath}`);
    return [];
  }
}

function writeInstallManifest(targetPath, installEntries) {
  const manifestPath = path.join(targetPath, INSTALL_MANIFEST_FILE);
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        entries: installEntries.slice().sort(),
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

function resolveManagedPath(targetPath, entry) {
  const resolvedTarget = path.resolve(targetPath);
  const candidate = path.resolve(targetPath, entry);
  const relative = path.relative(resolvedTarget, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return candidate;
}

function pruneRemovedEntries(targetPath, previousEntries, installEntries) {
  const next = new Set(installEntries);
  for (const entry of previousEntries) {
    if (next.has(entry)) continue;
    const candidate = resolveManagedPath(targetPath, entry);
    if (!candidate) {
      console.warn(`  Skipping unsafe manifest entry: ${entry}`);
      continue;
    }
    fs.rmSync(candidate, { recursive: true, force: true });
    console.log(`  Removed stale entry: ${entry}`);
  }
}

function ensureTargetIsDirectory(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stats = fs.lstatSync(targetPath);
  if (stats.isDirectory()) return;
  if (stats.isSymbolicLink()) {
    try {
      if (fs.statSync(targetPath).isDirectory()) return;
    } catch {
      // fall through
    }
  }
  console.error(`  Install path exists but is not a directory: ${targetPath}`);
  process.exit(1);
}

function installForTarget(target) {
  const targetPath = target.path;

  ensureTargetIsDirectory(targetPath);

  if (!fs.existsSync(targetPath)) {
    const parent = path.dirname(targetPath);
    if (!fs.existsSync(parent)) {
      try {
        fs.mkdirSync(parent, { recursive: true });
      } catch (e) {
        console.error(`  Cannot create parent directory: ${parent} — ${e.message}`);
        process.exit(1);
      }
    }
    fs.mkdirSync(targetPath, { recursive: true });
  } else {
    console.log(`  Updating existing install at ${targetPath}…`);
  }

  const installEntries = getInstallEntries();
  const previousEntries = readInstallManifest(targetPath);
  pruneRemovedEntries(targetPath, previousEntries, installEntries);

  installEntries.forEach((name) => {
    const src = path.join(SKILLS_SRC, name);
    const dest = path.join(targetPath, name);
    copyRecursiveSync(src, dest, SKILLS_SRC);
  });

  writeInstallManifest(targetPath, installEntries);
  console.log(`  ✓ Installed ${installEntries.length} skill(s) to ${targetPath}`);
}

function main() {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    return;
  }

  if (!HOME) {
    console.error("Could not resolve home directory. Use --path <absolute-path>.");
    process.exit(1);
  }

  const targets = getTargets(opts);

  console.log(`Installing @kbuley/skills to ${targets.length} target(s):\n`);

  for (const target of targets) {
    console.log(`${target.name}:`);
    installForTarget(target);
    console.log();
  }

  console.log("Done. Use your agent's skill picker to activate individual skills.");
}

if (require.main === module) {
  main();
}

module.exports = {
  copyRecursiveSync,
  getInstallEntries,
  getTargets,
  installForTarget,
  main,
  parseArgs,
  pruneRemovedEntries,
  readInstallManifest,
  writeInstallManifest,
};
