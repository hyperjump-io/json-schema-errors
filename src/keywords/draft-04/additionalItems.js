import { evaluateSchema } from "../../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Pact from "@hyperjump/pact";

/**
 * @import { KeywordDefinition, NormalizedOutput } from "../../index.d.ts"
 */

/** @type KeywordDefinition<[number, string]> */
const additionalItemsKeyword = {
  evaluate([numberOfItems, additionalItems], instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "array") {
      return outputs;
    }

    for (const itemNode of Pact.drop(numberOfItems, Instance.iter(instance))) {
      outputs.push(evaluateSchema(additionalItems, itemNode, context));
    }

    return outputs;
  }
};

export default additionalItemsKeyword;
