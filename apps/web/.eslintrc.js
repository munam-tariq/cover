module.exports = {
  root: true,
  extends: ["@chatbot/eslint-config/next"],
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
};
