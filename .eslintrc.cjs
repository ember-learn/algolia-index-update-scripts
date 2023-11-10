'use strict';

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: '2022',
    sourceType: 'module',
    requireConfigFile: false,
  },
  extends: ['eslint:recommended', 'plugin:n/recommended', 'plugin:prettier/recommended'],
  env: {
    node: true,
    browser: false,
  },
  rules: {},
};
