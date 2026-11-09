import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = process.env.SITE || '01-counterpunch';

export default defineConfig({
  base: './', // relative asset paths, so the build works from any sub-folder (GitHub Pages)
  root: path.join(here, 'sites', site),
  resolve: { alias: { '@shared': path.join(here, 'shared') } },
  server: { fs: { allow: [here] }, host: 'localhost' },
  build: { outDir: path.join(here, 'docs', site.replace(/^\d+-/, '')), emptyOutDir: true },
});
