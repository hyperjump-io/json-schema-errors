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
 * subschemas. This describes the items that aren't present.
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

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/prefixItems"]) {
      const prefixItems = /** @type string[] */ (getCompiledKeywordValue(ast, schemaLocation));
      const length = Instance.typeOf(instance) === "array" ? Instance.length(instance) : 0;

      // In a positive view, "An array with more than {index} items". In a negated
      // view, "Either not an array or no more than {index} items".
      /** @type (localization: Localization, index: number) => ErrorObject */
      const hasItem = (localization, index) => ({
        message: localization.negated().getMaxItemsSuccessMessage(index),
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
