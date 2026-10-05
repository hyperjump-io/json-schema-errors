import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  describeConditional,
  getPlaceholder,
  getSuccesses,
  isPlaceholder
} from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/**
 * Errors and descriptions of the items that are present come from the item
 * subschemas. This describes the items that aren't present. Draft-04 style
 * 'items' with an array of schemas works the same way.
 *
 * @type ErrorHandler
 */
const prefixItemsErrorHandler = {
  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    // A value that doesn't exist can't have items that don't exist. This also
    // prevents infinitely describing recursive schemas.
    if (isPlaceholder(instance)) {
      return successes;
    }

    const keywordOutputs = [
      ...Object.entries(normalizedOutput["https://json-schema.org/keyword/prefixItems"] ?? {}),
      ...Object.entries(normalizedOutput["https://json-schema.org/keyword/draft-04/items"] ?? {})
    ];
    for (const [schemaLocation, keywordOutput] of keywordOutputs) {
      const prefixItems = /** @type string | string[] */ (keywordOutput.value);
      if (typeof prefixItems === "string") {
        // A single schema for all items applies to items that can't be named
        continue;
      }

      const length = Instance.typeOf(instance) === "array" ? Instance.length(instance) : 0;
      for (let index = length; index < prefixItems.length; index++) {
        // The item's subschema only applies if there's an item at that index
        const item = getPlaceholder(instance, String(index));
        successes.push(...describeConditional({
          condition: (context) => [{
            message: context.localization.getHasItemSuccessMessage(index),
            instanceLocation: Instance.uri(instance),
            schemaLocations: [schemaLocation]
          }],
          then: (context) => getSuccesses(prefixItems[index], item, context)
        }, instance, schemaLocation, context));
      }
    }

    return successes;
  }
};

export default prefixItemsErrorHandler;
