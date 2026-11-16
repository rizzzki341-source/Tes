import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const pkg = readJson('./package.json') as { version: string };
const tokens = readJson('./replica/design/tokens.json') as { color: Record<string, string> };

// index.html carries a %THEME_COLOR% placeholder so the browser chrome follows the bg token.
function themeColor(): Plugin {
  return {
    name: 'myanime-theme-color',
    transformIndexHtml: (html) => html.replaceAll('%THEME_COLOR%', tokens.color.bg ?? ''),
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), themeColor()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { outDir: 'dist', target: 'es2022' },
  server: { port: 5173 },
  preview: { port: 4173 },
});
