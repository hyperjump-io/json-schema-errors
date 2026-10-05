import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordDefinition } from "../index.d.ts"
 */

/** @type KeywordDefinition<string> */
const notKeyword = {
  evaluate(not, instance, context) {
    return [evaluateSchema(not, instance, context)];
  }
};

export default notKeyword;
