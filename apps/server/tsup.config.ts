import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // shared package ships TS source, so bundle it into the server build
  noExternal: ['@drawguess/shared'],
});
