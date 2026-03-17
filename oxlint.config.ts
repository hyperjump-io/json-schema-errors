import { defineConfig } from "oxlint";
import stylistic from "@stylistic/eslint-plugin";

import type { DummyRuleMap } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true
  },
  ignorePatterns: [
    "coverage/**"
  ],
  plugins: [
    "typescript",
    "import",
    "jsdoc",
    "node",
    "promise"
  ],
  jsPlugins: [
    "@stylistic/eslint-plugin"
  ],
  rules: {
    ...stylistic.configs.customize({
      arrowParens: true,
      braceStyle: "1tbs",
      commaDangle: "never",
      quotes: "double",
      semi: true
    }).rules as DummyRuleMap
  }
});
