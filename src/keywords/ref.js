import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordDefinition } from "../index.d.ts"
 */

/** @type KeywordDefinition<string> */
const refKeyword = {
  evaluate(ref, instance, context) {
    return [evaluateSchema(ref, instance, context)];
  }
};

export default refKeyword;
