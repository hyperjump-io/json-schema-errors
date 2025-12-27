import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordHandler<string[]> */
const anyOfNormalizationHandler = {
  evaluate(anyOf, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];
    for (const schemaLocation of anyOf) {
      outputs.push(evaluateSchema(schemaLocation, instance, context));
    }

    return outputs;
  }
};

export default anyOfNormalizationHandler;
