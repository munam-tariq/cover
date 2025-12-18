module.exports = {
  root: true,
  extends: ["@chatbot/eslint-config"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  env: {
    browser: true,
  },
};
