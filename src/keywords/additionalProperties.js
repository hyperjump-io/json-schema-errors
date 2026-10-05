import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { KeywordDefinition, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordDefinition<[RegExp, string]> */
const additionalPropertiesKeyword = {
  evaluate([isDefinedProperty, additionalProperties], instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "object") {
      return outputs;
    }

    for (const [propertyNameNode, property] of Instance.entries(instance)) {
      const propertyName = /** @type string */ (Instance.value(propertyNameNode));
      if (isDefinedProperty.test(propertyName)) {
        continue;
      }

      outputs.push(evaluateSchema(additionalProperties, property, context));
    }

    return outputs;
  }
};

export default additionalPropertiesKeyword;
