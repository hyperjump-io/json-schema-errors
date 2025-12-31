import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { KeywordHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordHandler<string> */
const unevaluatedItemsNormalizationHandler = {
  evaluate(unevaluatedItems, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "array") {
      return outputs;
    }

    for (const item of Instance.iter(instance)) {
      outputs.push(evaluateSchema(unevaluatedItems, item, context));
    }

    return outputs;
  },
  simpleApplicator: true
};

export default unevaluatedItemsNormalizationHandler;
