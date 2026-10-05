import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  describeConditional,
  evaluateRequirements,
  getCompiledKeywordValue,
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
  success: (normalizedOutput, instance, localization, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    // A value that doesn't exist can't have items that don't exist. This also
    // prevents infinitely describing recursive schemas.
    if (isPlaceholder(instance)) {
      return successes;
    }

    const schemaLocations = [
      ...Object.keys(normalizedOutput["https://json-schema.org/keyword/prefixItems"] ?? {}),
      ...Object.keys(normalizedOutput["https://json-schema.org/keyword/draft-04/items"] ?? {})
    ];
    for (const schemaLocation of schemaLocations) {
      const prefixItems = /** @type string | string[] */ (getCompiledKeywordValue(context.ast, schemaLocation));
      if (typeof prefixItems === "string") {
        // A single schema for all items applies to items that can't be named
        continue;
      }

      const length = Instance.typeOf(instance) === "array" ? Instance.length(instance) : 0;
      for (let index = length; index < prefixItems.length; index++) {
        // The item's subschema only applies if there's an item at that index
        const item = getPlaceholder(instance, String(index));
        const output = evaluateRequirements(prefixItems[index], item, context.ast);
        successes.push(...describeConditional({
          condition: (localization) => [{
            message: localization.getHasItemSuccessMessage(index),
            instanceLocation: Instance.uri(instance),
            schemaLocations: [schemaLocation]
          }],
          then: (localization) => getSuccesses(output, instance, localization, context)
        }, instance, schemaLocation, localization));
      }
    }

    return successes;
  }
};

export default prefixItemsErrorHandler;
