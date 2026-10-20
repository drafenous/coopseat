#!/usr/bin/env node
// Usage:
//   node .cursor/skills/semver-release/scripts/release.mjs status
//   node .cursor/skills/semver-release/scripts/release.mjs bump <desktop|web|ui> <major|minor|patch|x.y.z>
//   node .cursor/skills/semver-release/scripts/release.mjs notes <desktop|web|ui> <x.y.z>
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES = {
  desktop: {
    dir: 'coopseat-desktop',
    name: 'coopseat-desktop',
    tagPrefix: 'desktop-v',
    paths: ['coopseat-desktop', 'packages/ui'],
  },
  web: {
    dir: 'coopseat-web',
    name: 'coopseat-web',
    tagPrefix: 'web-v',
    paths: ['coopseat-web', 'packages/ui'],
  },
  ui: {
    dir: 'packages/ui',
    name: '@coopseat/ui',
    tagPrefix: 'ui-v',
    paths: ['packages/ui'],
  },
};
const UI_DEPENDENTS = ['coopseat-desktop', 'coopseat-web', 'coopseat-signal'];
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

const run = (cmd) =>
  execSync(cmd, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
const tryRun = (cmd) => {
  try {
    return run(cmd);
  } catch {
    return '';
  }
};
const fail = (msg) => {
  console.error(`error: ${msg}`);
  process.exit(1);
};

const root = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf8',
}).trim();

function readVersion(dir) {
  return JSON.parse(readFileSync(join(root, dir, 'package.json'), 'utf8'))
    .version;
}

// Regex edits keep the hand-formatted package.json files intact; JSON.stringify would reflow them.
function replaceInPackageJson(dir, pattern, replacement) {
  const file = join(root, dir, 'package.json');
  const before = readFileSync(file, 'utf8');
  const after = before.replace(pattern, replacement);
  if (after === before) fail(`no match for ${pattern} in ${dir}/package.json`);
  writeFileSync(file, after);
}

function lastTag(pkg) {
  return (
    tryRun(`git tag --list "${pkg.tagPrefix}*" --sort=-v:refname`)
      .split('\n')
      .find(Boolean) || ''
  );
}

function nextVersion(current, kind) {
  if (SEMVER.test(kind)) return kind;
  const [, maj, min, pat] = current.match(SEMVER).map(Number);
  if (kind === 'major') return `${maj + 1}.0.0`;
  if (kind === 'minor') return `${maj}.${min + 1}.0`;
  if (kind === 'patch') return `${maj}.${min}.${pat + 1}`;
  fail(`unknown bump "${kind}" (use major, minor, patch or x.y.z)`);
}

function status() {
  for (const [key, pkg] of Object.entries(PACKAGES)) {
    const tag = lastTag(pkg);
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const log = tryRun(
      `git log ${range} --format="%h %s" -- ${pkg.paths.join(' ')}`,
    );
    const commits = log ? log.split('\n') : [];
    console.log(
      `\n${key} (${pkg.name}) version=${readVersion(pkg.dir)} lastTag=${tag || 'none'} commitsSince=${commits.length}`,
    );
    for (const line of commits) console.log(`  ${line}`);
  }
  const dirty = tryRun('git status --porcelain');
  console.log(
    `\nbranch=${tryRun('git rev-parse --abbrev-ref HEAD')} clean=${dirty ? 'no' : 'yes'}`,
  );
}

function bump(key, kind) {
  const pkg = PACKAGES[key];
  if (!pkg)
    fail(`unknown package "${key}" (use ${Object.keys(PACKAGES).join(', ')})`);
  if (!kind) fail('missing bump kind');
  const current = readVersion(pkg.dir);
  const next = nextVersion(current, kind);
  const tag = `${pkg.tagPrefix}${next}`;
  if (tryRun(`git tag --list ${tag}`)) fail(`tag ${tag} already exists`);

  if (next !== current) {
    replaceInPackageJson(
      pkg.dir,
      `"version": "${current}"`,
      `"version": "${next}"`,
    );
    if (key === 'ui') {
      for (const dir of UI_DEPENDENTS) {
        replaceInPackageJson(
          dir,
          `"@coopseat/ui": "${current}"`,
          `"@coopseat/ui": "${next}"`,
        );
      }
    }
    // Without refreshing the lockfile, npm ci in CI fails on the mismatched workspace version.
    execSync('npm install --no-audit --no-fund', {
      cwd: root,
      stdio: 'inherit',
    });
  }

  console.log(
    JSON.stringify({
      package: key,
      from: current,
      to: next,
      tag,
      changelog: `${pkg.dir}/CHANGELOG.md`,
    }),
  );
}

function notes(key, version) {
  const pkg = PACKAGES[key];
  if (!pkg || !SEMVER.test(version || ''))
    fail('usage: release.mjs notes <desktop|web|ui> <x.y.z>');
  const lines = readFileSync(join(root, pkg.dir, 'CHANGELOG.md'), 'utf8').split(
    /\r?\n/,
  );
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1)
    fail(`no "## [${version}]" section in ${pkg.dir}/CHANGELOG.md`);
  const end = lines.findIndex(
    (line, i) => i > start && line.startsWith('## ['),
  );
  const body = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim();
  if (!body) fail(`section ${version} in ${pkg.dir}/CHANGELOG.md is empty`);
  console.log(body);
}

const [command, ...args] = process.argv.slice(2);
if (command === 'status') status();
else if (command === 'bump') bump(...args);
else if (command === 'notes') notes(...args);
else
  fail(
    'usage: release.mjs status | bump <desktop|web|ui> <major|minor|patch|x.y.z> | notes <desktop|web|ui> <x.y.z>',
  );
