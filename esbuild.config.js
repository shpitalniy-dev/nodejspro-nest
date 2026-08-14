/** @type {import('esbuild').BuildOptions} */
export default {
  entryPoints: ['./src/index.ts'],
  platform: 'node',
  target: 'node24',
  outdir: './build',
  bundle: true,
  color: true,
  logLevel: 'info',
  format: 'esm',
  packages: 'external',
};
