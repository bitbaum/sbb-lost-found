// Flat config (ESLint 10) for the backend workspaces (services/*, shared/*).
// Mirrors the fleet's node-library pattern (ai-kit, ai-forms): recommended
// presets only — the floor is "lint runs and can fail", not "lint encodes
// taste". Rules carried over verbatim from the previous .eslintrc.json.
//
// The frontend is NOT covered here: it has its own eslint.config.mjs
// (eslint-config-next flat config), and flat-config lookup finds the nearest
// config file, so files under frontend/ never reach this one.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // dist/ is tsc output; frontend/, mobile-demo/ and demo/ have their own
    // toolchains (or are static demos) — same exclusions as the old
    // .eslintrc.json ignorePatterns.
    ignores: ['**/dist/**', '**/node_modules/**', 'frontend/**', 'mobile-demo/**', 'demo/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      // Carried over from .eslintrc.json: `any` stays visible without failing
      // the gate on existing scaffold code.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        // caughtErrors:'none' preserves the pre-upgrade contract —
        // @typescript-eslint v8 flipped the default from 'none' to 'all',
        // which would newly flag every unused `catch (err)` binding.
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // Plain Node scripts at the repo root and in scripts/.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.nodeBuiltin } },
  },
);
