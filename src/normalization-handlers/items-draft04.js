import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type NormalizationHandler */
const itemsDraft04 = {
  evaluate(items, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "array") {
      return outputs;
    }

    // tuple validation
    if (Array.isArray(items)) {
      for (const [index, schemaLocation] of items.entries()) {
        const itemNode = Instance.step(String(index), instance);
        if (itemNode) {
          outputs.push(
            evaluateSchema(schemaLocation, itemNode, context)
          );
        }
      }
      return outputs;
    }

    // single schema applies to all items
    let index = 0;
    while (true) {
      const itemNode = Instance.step(String(index), instance);
      if (!itemNode) break;

      outputs.push(
        evaluateSchema(
          /** @type {string} */ (items),
          itemNode,
          context
        )
      );
      index++;
    }

    return outputs;
  },

  simpleApplicator: true
};

export default itemsDraft04;
