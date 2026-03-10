import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  outDir: 'dist',
  target: 'node22',
  platform: 'node',
  format: 'esm',
  clean: true,
  minify: true,
  dts: true,
});
