/**
 * @import { KeywordDefinition } from "../index.d.ts"
 */

/** @type KeywordDefinition<RegExp> */
const patternKeyword = {
  error: (pattern, localization) => localization.getPatternErrorMessage(pattern.source),
  requirement: (pattern, localization) => localization.getPatternSuccessMessage(pattern.source)
};

export default patternKeyword;
