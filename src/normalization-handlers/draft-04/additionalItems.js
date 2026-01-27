import { evaluateSchema } from "../../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Pact from "@hyperjump/pact";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../../index.d.ts"
 */

/** @type NormalizationHandler<[number, string]> */
const additionalItemsNormalizationHandler = {
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
  },
  simpleApplicator: true
};

export default additionalItemsNormalizationHandler;
