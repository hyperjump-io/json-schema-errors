import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { NormalizationHandler } from "../index.d.ts"
 */

/** @type NormalizationHandler<string> */
const ifNormalizationHandler = {
  evaluate(ifLocation, instance, context) {
    return [evaluateSchema(ifLocation, instance, context)];
  }
};

export default ifNormalizationHandler;
