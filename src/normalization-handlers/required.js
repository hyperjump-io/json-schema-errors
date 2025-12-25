/**
* @import { KeywordHandler } from "../index.d.ts"
*/

/** @type KeywordHandler */
const requiredNormalizationHandler = {
  appliesTo(type) {
    return type === "object";
  }
};

export default requiredNormalizationHandler;
