// eslint-config-next 16 ships a FLAT config natively (it peers eslint >=9 and
// exports `./core-web-vitals` as an array of config objects). It must be spread
// directly.
//
// It was previously wrapped in FlatCompat, which is the bridge for LEGACY
// eslintrc-style configs. Wrapping an already-flat config made the compat
// layer try to validate it as eslintrc and die on "Converting circular
// structure to JSON" — so `eslint .` could not run at all. That was invisible
// because the lint script called `next lint`, and Next 14's `next lint` finds
// no `.eslintrc*`, so it launched its interactive "How would you like to
// configure ESLint?" wizard instead of ever reaching the config. Two failures
// stacked: the runner never got to the config, and the config was broken.
import coreWebVitals from 'eslint-config-next/core-web-vitals';

// Named rather than an anonymous array literal — `import/no-anonymous-default-export`
// is part of the config this file loads, so exporting the array inline made the
// config warn about itself.
const config = [
  ...coreWebVitals,
  {
    // Build output and dependencies are not ours to lint. Without this, a
    // `.next/` left over from a local build makes lint fail on generated code.
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
];

export default config;
