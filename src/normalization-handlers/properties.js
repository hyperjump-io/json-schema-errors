import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as JsonPointer from "@hyperjump/json-pointer";

/**
 * @import { KeywordHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordHandler<Record<string, string>> */
const propertiesNormalizationHandler = {
  evaluate(properties, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "object") {
      return outputs;
    }

    for (const propertyName in properties) {
      const propertyNode = Instance.step(propertyName, instance);
      if (!propertyNode) {
        outputs.push({
          [JsonPointer.append(propertyName, Instance.uri(instance))]: {}
        });
      } else {
        outputs.push(evaluateSchema(properties[propertyName], propertyNode, context));
      }
    }

    return outputs;
  },
  simpleApplicator: true
};

export default propertiesNormalizationHandler;
