/**
 * @import { NormalizationHandler } from "../index.d.ts"
 */

/** @type NormalizationHandler<string> */
const ifNormalizationHandler = {
  evaluate() {
    return [];
  },
  simpleApplicator: true
};

export default ifNormalizationHandler;
