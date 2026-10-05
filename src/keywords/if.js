import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordDefinition } from "../index.d.ts"
 */

/** @type KeywordDefinition<string> */
const ifKeyword = {
  evaluate(ifLocation, instance, context) {
    return [evaluateSchema(ifLocation, instance, context)];
  }
};

export default ifKeyword;
