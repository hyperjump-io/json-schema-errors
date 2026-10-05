import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  allTrue,
  evaluateRequirements,
  getCompiledKeywordValue,
  getPlaceholder,
  getSuccesses,
  isPlaceholder,
  someTrue
} from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, Localization } from "../index.d.ts"
 */

/**
 * Errors and descriptions of the items that are present come from the item
 * subschemas. This describes the items that aren't present. Draft-04 style
 * 'items' with an array of schemas works the same way.
 *
 * @type ErrorHandler
 */
const prefixItemsErrorHandler = {
  error: () => [],

  success: (normalizedOutput, instance, localization, ast) => {
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
      const prefixItems = /** @type string | string[] */ (getCompiledKeywordValue(ast, schemaLocation));
      if (typeof prefixItems === "string") {
        // A single schema for all items applies to items that can't be named
        continue;
      }
      const length = Instance.typeOf(instance) === "array" ? Instance.length(instance) : 0;

      /** @type (localization: Localization, index: number) => ErrorObject */
      const hasItem = (localization, index) => ({
        message: localization.getHasItemSuccessMessage(index),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });

      for (let index = length; index < prefixItems.length; index++) {
        const item = getPlaceholder(instance, String(index));
        const output = evaluateRequirements(prefixItems[index], item, ast);
        const itemDescription = getSuccesses(output, instance, localization, ast);
        if (itemDescription.length === 0) {
          continue;
        }

        if (localization.isNegated) {
          // Fails if the value is an array with the item and the item fails
          const requirements = [
            hasItem(localization.negated(), index),
            ...someTrue(itemDescription.map((option) => [option]), instance, schemaLocation, localization)
          ];
          successes.push(...allTrue(requirements, instance, schemaLocation, localization));
        } else {
          // Passes if the item isn't there or the item passes
          const options = [[hasItem(localization.negated(), index)], itemDescription];
          successes.push(...someTrue(options, instance, schemaLocation, localization));
        }
      }
    }

    return successes;
  }
};

export default prefixItemsErrorHandler;
