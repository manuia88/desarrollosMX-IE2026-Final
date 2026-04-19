import { copyFile, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const SRC = join(ROOT, 'src');

const SERVICE_WORKER_ENTRY = join(SRC, 'background', 'service-worker.ts');
const CONTENT_DIR = join(SRC, 'content');

async function clean() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
}

async function buildPopup() {
  await build({
    root: ROOT,
    configFile: resolve(ROOT, 'vite.config.ts'),
    logLevel: 'warn',
  });
  await rename(join(DIST, 'src/popup/index.html'), join(DIST, 'popup.html'));
  await rm(join(DIST, 'src'), { recursive: true, force: true });
}

async function buildServiceWorker() {
  await build({
    root: ROOT,
    configFile: false,
    logLevel: 'warn',
    build: {
      outDir: DIST,
      emptyOutDir: false,
      target: 'es2022',
      lib: {
        entry: SERVICE_WORKER_ENTRY,
        formats: ['es'],
        fileName: () => 'service-worker.js',
      },
      rollupOptions: {
        output: {
          preserveModules: false,
        },
      },
    },
  });
}

async function listContentScripts() {
  try {
    const files = await readdir(CONTENT_DIR);
    return files.filter((f) => f.endsWith('.ts')).map((f) => join(CONTENT_DIR, f));
  } catch {
    return [];
  }
}

async function buildContentScript(entry) {
  const name = entry.split('/').at(-1).replace(/\.ts$/, '');
  await build({
    root: ROOT,
    configFile: false,
    logLevel: 'warn',
    build: {
      outDir: join(DIST, 'content'),
      emptyOutDir: false,
      target: 'es2022',
      lib: {
        entry,
        formats: ['iife'],
        name: `dmxContent_${name.replace(/-/g, '_')}`,
        fileName: () => `${name}.js`,
      },
      rollupOptions: {
        output: {
          preserveModules: false,
        },
      },
    },
  });
}

async function copyManifest() {
  await copyFile(join(ROOT, 'manifest.json'), join(DIST, 'manifest.json'));
}

async function copyAssets() {
  const iconsDir = join(SRC, 'assets', 'icons');
  try {
    const files = await readdir(iconsDir);
    const targetDir = join(DIST, 'icons');
    await mkdir(targetDir, { recursive: true });
    for (const file of files) {
      await copyFile(join(iconsDir, file), join(targetDir, file));
    }
  } catch {
    // icons not yet provided — skeleton stage
  }
}

async function main() {
  await clean();
  await buildPopup();
  await buildServiceWorker();
  const contentEntries = await listContentScripts();
  for (const entry of contentEntries) {
    await buildContentScript(entry);
  }
  await copyManifest();
  await copyAssets();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
