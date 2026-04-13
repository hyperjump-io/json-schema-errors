import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ContainsRange, ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const containsErrorHandler = (normalizedErrors, instance, localization, resolver) => {
  if (!resolver?.getSiblingKeywordValue) {
    throw new Error("Missing resolver.getSiblingKeywordValue in error handler context");
  }

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
      const minContains = resolver.getSiblingKeywordValue(schemaLocation, "https://json-schema.org/keyword/minContains");
      if (minContains) {
        range.minContains = /** @type number */ (minContains.keywordValue);
        schemaLocations.push(minContains.keywordLocation);
      }

      const maxContains = resolver.getSiblingKeywordValue(schemaLocation, "https://json-schema.org/keyword/maxContains");
      if (maxContains) {
        range.maxContains = /** @type number */ (maxContains.keywordValue);
        schemaLocations.push(maxContains.keywordLocation);
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
