import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { KeywordDefinition, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordDefinition<Record<string, string>> */
const propertiesKeyword = {
  evaluate(properties, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "object") {
      return outputs;
    }

    for (const [propertyNameNode, propertyNode] of Instance.entries(instance)) {
      const propertyName = Instance.value(propertyNameNode);

      if (properties[propertyName]) {
        outputs.push(evaluateSchema(properties[propertyName], propertyNode, context));
      }
    }

    return outputs;
  }
};

export default propertiesKeyword;
