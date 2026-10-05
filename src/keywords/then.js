import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordDefinition } from "../index.d.ts"
 */

/** @type KeywordDefinition<[string, string]> */
const thenKeyword = {
  evaluate([, then], instance, context) {
    return [evaluateSchema(then, instance, context)];
  },
  conditional: true
};

export default thenKeyword;
