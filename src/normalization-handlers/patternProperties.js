import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type NormalizationHandler<[RegExp, string][]> */
const patternPropertiesNormalizationHandler = {
  evaluate(patternProperties, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "object") {
      return outputs;
    }

    for (const [pattern, schemaLocation] of patternProperties) {
      for (const [propertyNameNode, propertyValue] of Instance.entries(instance)) {
        const propertyName = /** @type string */ (Instance.value(propertyNameNode));
        if (pattern.test(propertyName)) {
          outputs.push(evaluateSchema(schemaLocation, propertyValue, context));
        }
      }
    }

    return outputs;
  },
  simpleApplicator: true
};

export default patternPropertiesNormalizationHandler;
