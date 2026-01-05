import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type NormalizationHandler<string[]> */
const allOfNormalizationHandler = {
  evaluate(allOf, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    for (const schemaLocation of allOf) {
      outputs.push(evaluateSchema(schemaLocation, instance, context));
    }

    return outputs;
  },
  simpleApplicator: true
};

export default allOfNormalizationHandler;
