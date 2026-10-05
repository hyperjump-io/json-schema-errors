import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordDefinition, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordDefinition<string[]> */
const allOfKeyword = {
  evaluate(allOf, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    for (const schemaLocation of allOf) {
      outputs.push(evaluateSchema(schemaLocation, instance, context));
    }

    return outputs;
  }
};

export default allOfKeyword;
