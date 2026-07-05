// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'prisma/migrations/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['prisma/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
