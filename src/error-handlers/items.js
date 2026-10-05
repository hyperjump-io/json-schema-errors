import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeScope, getPlaceholder, isPlaceholder } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, InstanceOutput } from "../index.d.ts"
 */

/**
 * Errors and descriptions of the items that are present come from the item
 * subschemas. This describes what's required of every item the keyword applies
 * to, including items that could be added.
 *
 * @type ErrorHandler
 */
const itemsErrorHandler = {
  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    // A value that doesn't exist can't have items that don't exist. This also
    // prevents infinitely describing recursive schemas.
    if (isPlaceholder(instance)) {
      return successes;
    }

    for (const [schemaLocation, startIndex, itemsLocation] of getItemsKeywords(normalizedOutput)) {
      // An item that doesn't exist stands in for any item
      const length = Instance.typeOf(instance) === "array" ? Instance.length(instance) : 0;
      successes.push(...describeScope({
        subschemaLocation: itemsLocation,
        placeholder: getPlaceholder(instance, String(Math.max(startIndex, length))),
        each: (localization, count) => localization.getEachItemSuccessMessage(startIndex, count),
        none: (localization) => localization.getMaxItemsSuccessMessage(startIndex)
      }, instance, schemaLocation, context));
    }

    return successes;
  }
};

/**
 * Finds the keywords that apply a schema to every item starting at some index.
 *
 * @type (normalizedOutput: InstanceOutput) => [string, number, string][]
 */
const getItemsKeywords = (normalizedOutput) => {
  /** @type [string, number, string][] */
  const keywords = [];

  for (const keywordUri of ["https://json-schema.org/keyword/items", "https://json-schema.org/keyword/draft-04/additionalItems"]) {
    for (const schemaLocation in normalizedOutput[keywordUri]) {
      const [startIndex, itemsLocation] = /** @type [number, string] */ (normalizedOutput[keywordUri][schemaLocation].value);
      // 'additionalItems' doesn't apply unless 'items' is an array
      if (startIndex !== Number.MAX_SAFE_INTEGER) {
        keywords.push([schemaLocation, startIndex, itemsLocation]);
      }
    }
  }

  // Draft-04 style 'items' with a single schema applies to every item
  for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/draft-04/items"]) {
    const items = /** @type string | string[] */ (normalizedOutput["https://json-schema.org/keyword/draft-04/items"][schemaLocation].value);
    if (typeof items === "string") {
      keywords.push([schemaLocation, 0, items]);
    }
  }

  return keywords;
};

export default itemsErrorHandler;
