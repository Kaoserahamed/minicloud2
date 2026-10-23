module.exports = {
  env: { node: true },
  globals: { Promise: 'readonly', Map: 'readonly', Set: 'readonly', AbortController: 'readonly' },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'eqeqeq': ['error', 'always'],
    'curly': 'error',
    'strict': ['error', 'safe'],
  },
};
