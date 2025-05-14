module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2018,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "linebreak-style": "off", // Désactiver la vérification des fins de ligne
    "comma-dangle": ["error", "always-multiline"], // Permettre les virgules en fin
    "object-curly-spacing": ["error", "always"], // Espaces dans les objets
    "max-len": "off", // Désactiver complètement la limite de longueur
    "require-jsdoc": "off", // Désactiver l'exigence de JSDoc
    "valid-jsdoc": "off", // Désactiver la validation JSDoc
    "new-cap": ["error", { "capIsNewExceptions": ["express.Router"] }], // Exceptions pour Router
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // Juste des warnings
    "no-redeclare": "warn", // Juste des warnings
    "semi": ["error", "always"], // Point-virgule obligatoire
    "indent": ["error", 2], // Indentation de 2 espaces
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};