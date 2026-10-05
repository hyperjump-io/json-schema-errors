import { evaluateSchema } from "../../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../../index.d.ts"
 */

/** @type NormalizationHandler<string | string[]> */
const itemsDraft04NormalizationHandler = {
  evaluate(items, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "array") {
      return outputs;
    }

    if (typeof items === "string") {
      for (const itemNode of Instance.iter(instance)) {
        outputs.push(evaluateSchema(items, itemNode, context));
      }
    } else {
      for (const [index, schemaLocation] of items.entries()) {
        const itemNode = Instance.step(String(index), instance);
        if (itemNode) {
          outputs.push(evaluateSchema(schemaLocation, itemNode, context));
        }
      }
    }

    return outputs;
  },
  simpleApplicator: true
};

export default itemsDraft04NormalizationHandler;
