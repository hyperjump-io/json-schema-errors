import { evaluateSchema } from "../../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../../index.d.ts"
 */

/** @type NormalizationHandler<[string, string | string[]][]> */
const dependenciesNormalizationHandler = {
  evaluate(dependencies, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "object") {
      return outputs;
    }

    for (const [propertyName, dependency] of dependencies) {
      if (!Instance.has(propertyName, instance) || typeof dependency !== "string") {
        continue;
      }

      outputs.push(evaluateSchema(dependency, instance, context));
    }

    return outputs;
  }
};

export default dependenciesNormalizationHandler;
