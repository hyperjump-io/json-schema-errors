import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Pact from "@hyperjump/pact";

/**
 * @import { KeywordDefinition, NormalizedOutput } from "../index.d.ts"
 */

/** @type KeywordDefinition<[number, string]> */
const itemsKeyword = {
  evaluate([numberOfPrefixItems, items], instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "array") {
      return outputs;
    }

    for (const itemNode of Pact.drop(numberOfPrefixItems, Instance.iter(instance))) {
      outputs.push(evaluateSchema(items, itemNode, context));
    }

    return outputs;
  }
};

export default itemsKeyword;
