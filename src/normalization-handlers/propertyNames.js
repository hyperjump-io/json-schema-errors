import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type NormalizationHandler<string> */
const propertyNamesNormalizationHandler = {
  evaluate(propertyNames, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "object") {
      return outputs;
    }

    for (const propertyName of Instance.keys(instance)) {
      propertyName.pointer = propertyName.pointer.replace(/^\*/, "");
      outputs.push(evaluateSchema(propertyNames, propertyName, context));
    }

    return outputs;
  },
  simpleApplicator: true
};

export default propertyNamesNormalizationHandler;
