/**
 * @import { KeywordHandler } from "../index.d.ts"
 */

/** @type KeywordHandler */
const maximumNormalizationHandler = {
  appliesTo(type) {
    return type === "number";
  }
};

export default maximumNormalizationHandler;
