import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const workflow = fs.readFileSync(new URL('.github/workflows/deploy-cloudflare.yml', root), 'utf8');
const version = fs.readFileSync(new URL('VERSION', root), 'utf8').trim();
const pkg = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));

test('release metadata stays aligned', () => {
  assert.equal(pkg.version, version);
  assert.match(version, /^\d+\.\d+\.\d+$/);
});

test('production deploy publishes a GitHub release', () => {
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /gh release create/);
  assert.match(workflow, /--target "\$GITHUB_SHA"/);
});
