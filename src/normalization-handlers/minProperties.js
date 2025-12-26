/**
 * @import { KeywordHandler } from "../index.d.ts"
 */

/** @type KeywordHandler */
const minPropertiesNormalizationHandler = {
  appliesTo(type) {
    return type === "object";
  }
};

export default minPropertiesNormalizationHandler;
