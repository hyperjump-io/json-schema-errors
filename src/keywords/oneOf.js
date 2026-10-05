import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordDefinition, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordDefinition<string[]> */
const oneOfKeyword = {
  evaluate(oneOf, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    for (const schemaLocation of oneOf) {
      outputs.push(evaluateSchema(schemaLocation, instance, context));
    }

    return outputs;
  }
};

export default oneOfKeyword;
