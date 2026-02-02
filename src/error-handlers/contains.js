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
      const parentLocation = pointerPop(schemaLocation);

      for (const minContainsLocation in normalizedErrors["https://json-schema.org/keyword/minContains"]) {
        if (pointerPop(minContainsLocation) === parentLocation) {
          const minContainsNode = await getSchema(minContainsLocation);
          range.minContains = /** @type number */ (Schema.value(minContainsNode));
          schemaLocations.push(minContainsLocation);
          break;
        }
      }

      for (const maxContainsLocation in normalizedErrors["https://json-schema.org/keyword/maxContains"]) {
        if (pointerPop(maxContainsLocation) === parentLocation) {
          const maxContainsNode = await getSchema(maxContainsLocation);
          range.maxContains = /** @type number */ (Schema.value(maxContainsNode));
          schemaLocations.push(maxContainsLocation);
          break;
        }
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

/** @type (pointer: string) => string */
const pointerPop = (pointer) => pointer.replace(/\/[^/]+$/, "");

export default containsErrorHandler;
