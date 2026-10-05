import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { NormalizationHandler } from "../index.d.ts"
 */

/** @type NormalizationHandler<string> */
const refNormalizationHandler = {
  evaluate(ref, instance, context) {
    return [evaluateSchema(ref, instance, context)];
  }
};

export default refNormalizationHandler;
