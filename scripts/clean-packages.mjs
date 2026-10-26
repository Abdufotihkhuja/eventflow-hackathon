import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, 'package.json');
const dryRun = process.argv.includes('--dry-run');
const removeLocks = process.argv.includes('--locks');

if (!fs.existsSync(packageJsonPath)) {
  console.error('package.json not found in current directory');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const workspaces = Array.isArray(packageJson.workspaces) ? packageJson.workspaces : [];

const targets = new Set([path.join(rootDir, 'node_modules')]);

for (const pattern of workspaces) {
  if (!pattern.endsWith('/*')) continue;

  const baseDir = path.join(rootDir, pattern.slice(0, -2));
  if (!fs.existsSync(baseDir)) continue;

  for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    targets.add(path.join(baseDir, entry.name, 'node_modules'));

    if (removeLocks) {
      targets.add(path.join(baseDir, entry.name, 'package-lock.json'));
    }
  }
}

if (removeLocks) {
  targets.add(path.join(rootDir, 'package-lock.json'));
}

const existingTargets = [...targets].filter((targetPath) => fs.existsSync(targetPath));

if (existingTargets.length === 0) {
  console.log('Nothing to remove.');
  process.exit(0);
}

console.log(dryRun ? 'Dry run. Planned removals:' : 'Removing:');
for (const targetPath of existingTargets) {
  console.log(`- ${path.relative(rootDir, targetPath) || '.'}`);

  if (!dryRun) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

if (dryRun) {
  console.log('\nRun `npm run clean:packages` to remove node_modules.');
  if (!removeLocks) {
    console.log('Add `-- --locks` to remove package-lock.json files too.');
  }
} else {
  console.log('\nDone.');
}
