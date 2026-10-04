import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { NormalizationHandler } from "../index.d.ts"
 */

/** @type NormalizationHandler<[string, string]> */
const elseNormalizationHandler = {
  evaluate([, elseLocation], instance, context) {
    return [evaluateSchema(elseLocation, instance, context)];
  },
  validityFromSubschemas: true
};

export default elseNormalizationHandler;
