import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordDefinition } from "../index.d.ts"
 */

/** @type KeywordDefinition<[string, string]> */
const elseKeyword = {
  evaluate([, elseLocation], instance, context) {
    return [evaluateSchema(elseLocation, instance, context)];
  },
  conditional: true
};

export default elseKeyword;
