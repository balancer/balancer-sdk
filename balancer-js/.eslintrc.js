module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'mocha-no-only'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'comma-spacing': ['error', { before: false, after: true }],
    'prettier/prettier': 'error',
    'mocha-no-only/mocha-no-only': ['error'],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            // Avoid imports using 'ethers*' because they lead to compilation issues in rollup builds
            // Probably related to rollup config not being able to resolve the 'ethers*'
            // migrate to: imports (globals: { ethers: 'ethers' }) once we switch to ethers vs individual packages
            group: ['ethers*'],
            message:
              "import from '@ethersproject/*' instead to avoid rollup build issues",
          },
          {
            group: ['@balancer/sdk'],
            message:
              "import from '@balancer/sdk' allowed only in the examples",
          },
        ],
      },
    ]
  },
};
