/**
 * @import { KeywordHandler } from "../index.d.ts"
 */

/** @type KeywordHandler */
const exclusiveMaximumNormalizationHandler = {
  appliesTo(type) {
    return type === "number";
  }
};

export default exclusiveMaximumNormalizationHandler;
