import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type NormalizationHandler<string[]> */
const prefixItemsNormalizationHandler = {
  evaluate(prefixItems, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "array") {
      return outputs;
    }

    for (const [index, schemaLocation] of prefixItems.entries()) {
      const itemNode = Instance.step(String(index), instance);
      if (itemNode) {
        outputs.push(evaluateSchema(schemaLocation, itemNode, context));
      }
    }

    return outputs;
  },
  simpleApplicator: true
};

export default prefixItemsNormalizationHandler;
