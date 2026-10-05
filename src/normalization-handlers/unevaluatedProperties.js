import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type NormalizationHandler<string> */
const unevaluatedPropertiesNormalizationHandler = {
  evaluate(unevaluatedProperties, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "object") {
      return outputs;
    }

    for (const property of Instance.values(instance)) {
      outputs.push(evaluateSchema(unevaluatedProperties, property, context));
    }

    return outputs;
  }
};

export default unevaluatedPropertiesNormalizationHandler;
