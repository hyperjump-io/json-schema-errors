import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { NormalizationHandler } from "../index.d.ts"
 */

/** @type NormalizationHandler<[string, string]> */
const thenNormalizationHandler = {
  evaluate([, then], instance, context) {
    return [evaluateSchema(then, instance, context)];
  },
  validityFromSubschemas: true
};

export default thenNormalizationHandler;
