import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const FORBIDDEN_DTO_NAMES =
  '/^(Device|Category|Assignment|User|Problem|AuthResponse|DashboardStats)(DTO|Response)?$/';

export function createEslintConfig({ tsconfigRootDir, mode = 'all' } = {}) {
  const baseTs = [
    {
      ignores: [
        '**/dist/**',
        '**/build/**',
        '**/node_modules/**',
        '**/coverage/**',
        '**/.turbo/**',
        'packages/schema/src/generated/**',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      plugins: {
        import: importPlugin,
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
      },
    },
  ];

  const nodeBlock = {
    files: ['apps/api/**/*.ts', 'packages/schema/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  };

  const webBlock = {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // НВ-5: заборона ручного оголошення API-типів на клієнті
      'no-restricted-syntax': [
        'error',
        {
          selector: `TSInterfaceDeclaration[id.name=${FORBIDDEN_DTO_NAMES}]`,
          message: 'API DTO types must be imported from @assetpool/schema, not manually declared.',
        },
        {
          selector: `TSTypeAliasDeclaration[id.name=${FORBIDDEN_DTO_NAMES}]`,
          message: 'API DTO types must be imported from @assetpool/schema, not manually declared.',
        },
      ],
    },
  };

  if (mode === 'node') return [...baseTs, nodeBlock];
  if (mode === 'react') return [...baseTs, webBlock];
  return [...baseTs, nodeBlock, webBlock];
}

