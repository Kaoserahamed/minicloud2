module.exports = {
  env: { node: true },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': 'error',
    'strict': ['error', 'safe'],
  },
};
