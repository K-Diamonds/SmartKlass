import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(apiRoot));

const packages = [
  {
    name: '@smartklass/shared',
    source: join(repoRoot, 'packages/shared/dist'),
  },
  {
    name: '@smartklass/database',
    source: join(repoRoot, 'packages/database/dist'),
  },
];

function copyIntoNodeModules(packageName, sourceDist) {
  const scope = packageName.startsWith('@') ? packageName.slice(1).replace('/', '+') : packageName;
  const pnpmRoot = join(apiRoot, 'node_modules/.pnpm');
  if (!existsSync(pnpmRoot)) {
    return false;
  }

  let copied = false;
  for (const entry of readdirSync(pnpmRoot)) {
    if (!entry.includes(scope)) {
      continue;
    }

    const target = join(
      pnpmRoot,
      entry,
      'node_modules',
      packageName,
      'dist',
    );
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    cpSync(sourceDist, target, { recursive: true });
    copied = true;
    console.log(`Vendored ${packageName} → ${target}`);
  }

  return copied;
}

for (const pkg of packages) {
  if (!existsSync(pkg.source)) {
    throw new Error(`Missing build output for ${pkg.name}: ${pkg.source}`);
  }

  const copied = copyIntoNodeModules(pkg.name, pkg.source);
  if (!copied) {
  const fallback = join(apiRoot, 'node_modules', pkg.name, 'dist');
    rmSync(fallback, { recursive: true, force: true });
    mkdirSync(dirname(fallback), { recursive: true });
    cpSync(pkg.source, fallback, { recursive: true });
    console.log(`Vendored ${pkg.name} → ${fallback}`);
  }
}
