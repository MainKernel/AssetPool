import { createEslintConfig } from '@assetpool/config/eslint.base.js';

export default [
  {
    ignores: [
      'eslint.config.js',
      'commitlint.config.js',
      'packages/config/eslint.base.js',
      '**/dist/**',
      '**/node_modules/**',
    ],
  },
  ...createEslintConfig({ tsconfigRootDir: import.meta.dirname }),
];

