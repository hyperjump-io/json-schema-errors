import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { KeywordDefinition, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordDefinition<string> */
const propertyNamesKeyword = {
  evaluate(propertyNames, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "object") {
      return outputs;
    }

    for (const propertyName of Instance.keys(instance)) {
      outputs.push(evaluateSchema(propertyNames, propertyName, context));
    }

    return outputs;
  }
};

export default propertyNamesKeyword;
