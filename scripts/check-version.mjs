import fs from 'node:fs';

const version = fs.readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`VERSION must be semver, got: ${version}`);
  process.exit(1);
}
if (pkg.version !== version) {
  console.error(`Version mismatch: VERSION=${version}, package.json=${pkg.version}`);
  process.exit(1);
}
console.log(`Version metadata OK: v${version}`);
