import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { evaluateSchema } from "../../json-schema-errors.js";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../../index.d.ts"
 */

/** @type NormalizationHandler<string> */
const containsDraft06NormalizationHandler = {
  evaluate(contains, instance, context) {
    /** @type NormalizedOutput[] */
    const output = [];

    if (Instance.typeOf(instance) !== "array") {
      return output;
    }

    for (const item of Instance.iter(instance)) {
      output.push(evaluateSchema(contains, item, context));
    }

    return output;
  }
};

export default containsDraft06NormalizationHandler;
