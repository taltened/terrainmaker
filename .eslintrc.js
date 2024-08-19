module.exports = {
  extends: 'erb',
  plugins: ['@typescript-eslint'],
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-filename-extension': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-import-module-exports': 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'error',
    'no-unused-vars': 'off',
    // @tada
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    // rule is disruptive
    'prettier/prettier': 'off',
    // rule blocks useful syntax
    'no-nested-ternary': 'off',
    'no-bitwise': 'off',
    'no-plusplus': 'off',
    'no-else-return': 'off',
    // rule enforces anti-patterns
    'consistent-return': 'off', // nested void promises
    'promise/no-nesting': 'off',
    'import/prefer-default-export': 'off',
    'react/require-default-props': 'off',
    'class-methods-use-this': 'off', // temporary, until classes are removed
    // rule triggers when rule is not violated (buggy)
    'jsx-a11y/label-has-associated-control': 'off',
    'no-useless-constructor': 'off', // constructor with private arg
    'no-empty-function': 'off', // constructor with private arg
    'prefer-destructuring': 'off', // type narrowing
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.ts'),
      },
      typescript: {},
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};
