import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { KeywordHandler, NormalizedOutput } from "../index.d.ts"
 */

/**
 * @typedef {{
 *   contains: string;
 *   minContains: number;
 *   maxContains: number;
 * }} ContainsAst
 */

/** @type KeywordHandler<ContainsAst> */
const containsNormalizationHandler = {
  evaluate({ contains }, instance, context) {
    /** @type NormalizedOutput[] */
    const output = [];

    if (Instance.typeOf(instance) !== "array") {
      return output;
    }

    for (const item of Instance.iter(instance)) {
      output.push(evaluateSchema(contains, item, context));
    }

    return output;
  }
};

export default containsNormalizationHandler;
