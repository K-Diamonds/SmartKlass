import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const packages = ['@smartklass/shared', '@smartklass/database'];

function resolvePackageDist(packageName) {
  const linkPath = join(apiRoot, 'node_modules', packageName);
  const resolved = realpathSync(linkPath);
  return join(resolved, 'dist');
}

function copyIntoNodeModules(packageName, sourceDist) {
  const scope = packageName.startsWith('@')
    ? packageName.slice(1).replace('/', '+')
    : packageName;
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
    if (existsSync(target)) {
      try {
        if (realpathSync(target) === realpathSync(sourceDist)) {
          console.log(`Skipping ${packageName} — dist already linked at ${target}`);
          copied = true;
          continue;
        }
      } catch {
        // Fall through and replace target contents.
      }
      rmSync(target, { recursive: true, force: true });
    }
    mkdirSync(dirname(target), { recursive: true });
    cpSync(sourceDist, target, { recursive: true });
    copied = true;
    console.log(`Vendored ${packageName} → ${target}`);
  }

  return copied;
}

for (const packageName of packages) {
  const sourceDist = resolvePackageDist(packageName);
  if (!existsSync(sourceDist)) {
    throw new Error(
      `Missing build output for ${packageName}: ${sourceDist} (run workspace builds first)`,
    );
  }

  const copied = copyIntoNodeModules(packageName, sourceDist);
  if (!copied) {
    const fallback = join(apiRoot, 'node_modules', packageName, 'dist');
    if (existsSync(fallback)) {
      try {
        if (realpathSync(fallback) === realpathSync(sourceDist)) {
          console.log(`Skipping ${packageName} — dist already linked at ${fallback}`);
          continue;
        }
      } catch {
        // Replace fallback below.
      }
      rmSync(fallback, { recursive: true, force: true });
    }
    mkdirSync(dirname(fallback), { recursive: true });
    cpSync(sourceDist, fallback, { recursive: true });
    console.log(`Vendored ${packageName} → ${fallback}`);
  }
}
