import esbuild from 'esbuild';

import config from './esbuild.config.js';

esbuild
  .build({
    ...config,
    minify: true,
  })
  .then(() => console.log('⚡Bundle build complete⚡'))
  .catch(() => {
    throw new Error('Build failed');
  });
