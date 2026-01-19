import { evaluateSchema } from "../json-schema-errors.js";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { NormalizationHandler, NormalizedOutput } from "../index.d.ts"
 */

/** @type NormalizationHandler */
const additionalItemsDraft04 = {
  evaluate(additionalItems, instance, context) {
    /** @type NormalizedOutput[] */
    const outputs = [];

    if (Instance.typeOf(instance) !== "array") {
      return outputs;
    }

    // If items is not a tuple, additionalItems is ignored
const items =
  /** @type {{ schema?: { items?: unknown } }} */
  (context).schema?.items;


    if (!Array.isArray(items)) {
      return outputs;
    }

    const startIndex = items.length;

    // additionalItems: true → always valid
    if (additionalItems === true) {
      return outputs;
    }

    let index = startIndex;

    while (true) {
      const itemNode = Instance.step(String(index), instance);
      if (!itemNode) break;

      // additionalItems: false → validate against false schema
if (additionalItems === false) {
  outputs.push(
    evaluateSchema(
      /** @type {string} */ ("false"),
      itemNode,
      context
    )
  );


      } else {
        // additionalItems is a schema
        outputs.push(
          evaluateSchema(
            /** @type {string} */ (additionalItems),
            itemNode,
            context
          )
        );
      }

      index++;
    }

    return outputs;
  },

  simpleApplicator: true
};

export default additionalItemsDraft04;
