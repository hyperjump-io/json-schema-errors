import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ContainsRange } from "../localization.js"
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const containsErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  const keywordUris = [
    "https://json-schema.org/keyword/contains",
    "https://json-schema.org/keyword/draft-06/contains"
  ];

  for (const keywordUri of keywordUris) {
    for (const schemaLocation in normalizedErrors[keywordUri]) {
      if (normalizedErrors[keywordUri][schemaLocation] == true) {
        continue;
      }

      /** @type string[] */
      const schemaLocations = [schemaLocation];

      /** @type ContainsRange */
      const range = {};

      for (const minContainsLocation in normalizedErrors["https://json-schema.org/keyword/minContains"]) {
        const minContainsNode = await getSchema(minContainsLocation);
        const minContains = /** @type number */ (Schema.value(minContainsNode));
        range.minContains = Math.max(range.minContains ?? -1, minContains);
        schemaLocations.push(minContainsLocation);
      }

      for (const maxContainsLocation in normalizedErrors["https://json-schema.org/keyword/maxContains"]) {
        const maxContainsNode = await getSchema(maxContainsLocation);
        const maxContains = /** @type number */ (Schema.value(maxContainsNode));
        range.maxContains = Math.min(range.maxContains ?? Number.MAX_VALUE, maxContains);
        schemaLocations.push(maxContainsLocation);
      }

      errors.push({
        message: localization.getContainsErrorMessage(range),
        instanceLocation: Instance.uri(instance),
        schemaLocations: schemaLocations
      });
    }
  }

  return errors;
};

export default containsErrorHandler;
