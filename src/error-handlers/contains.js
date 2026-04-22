import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue, getSiblingKeywordLocation } from "../json-schema-errors.js";

/**
 * @import { ContainsAst } from "../normalization-handlers/contains.js"
 * @import { ContainsRange, ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const containsErrorHandler = (normalizedErrors, instance, localization, ast) => {
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

      const contains = /** @type ContainsAst */ (getCompiledKeywordValue(ast, schemaLocation));

      /** @type ContainsRange */
      const range = {};
      if (typeof contains !== "string") {
        if (contains.minContains !== 1) {
          range.minContains = contains.minContains;
          const minContainsLocation = getSiblingKeywordLocation(ast, schemaLocation, "https://json-schema.org/keyword/minContains");
          schemaLocations.push(minContainsLocation);
        }

        if (contains.maxContains !== Number.MAX_SAFE_INTEGER) {
          range.maxContains = contains.maxContains;
          const maxContainsLocation = getSiblingKeywordLocation(ast, schemaLocation, "https://json-schema.org/keyword/maxContains");
          schemaLocations.push(maxContainsLocation);
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

export default containsErrorHandler;
