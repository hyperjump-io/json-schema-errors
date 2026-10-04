import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue, getSiblingKeywordLocation, getSuccesses, isPassing } from "../json-schema-errors.js";

/**
 * @import { ContainsAst } from "../normalization-handlers/contains.js"
 * @import { ContainsRange, ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const containsErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];

    const keywordUris = [
      "https://json-schema.org/keyword/contains",
      "https://json-schema.org/keyword/draft-06/contains"
    ];

    for (const keywordUri of keywordUris) {
      for (const schemaLocation in normalizedErrors[keywordUri]) {
        const containsOutput = normalizedErrors[keywordUri][schemaLocation];
        if (containsOutput === true) {
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

            // Too many items matched. Report on each matching item how it
            // satisfied the 'contains' schema so the user knows what needs to change.
            const items = [...Instance.iter(instance)];
            const itemOutputs = Array.isArray(containsOutput) ? containsOutput : [];
            const matches = items.flatMap((item, index) => {
              const itemOutput = itemOutputs[index];
              return itemOutput && isPassing(itemOutput) ? [{ item, itemOutput }] : [];
            });
            if (matches.length > contains.maxContains) {
              const descriptions = matches.map(({ itemOutput }) => {
                return getSuccesses(itemOutput, instance, localization, ast);
              });

              // If any match can't be described, the errors would be misleading
              if (descriptions.every((description) => description.length > 0)) {
                matches.forEach(({ item }, index) => {
                  errors.push({
                    message: localization.getContainsTooManyErrorMessage(contains.maxContains),
                    alternatives: [descriptions[index]],
                    instanceLocation: Instance.uri(item),
                    schemaLocations: [schemaLocation, maxContainsLocation]
                  });
                });
                continue;
              } else if (matches.length === itemOutputs.length) {
                // Every item matched and there's nothing to say about why, so the
                // problem is effectively that there are too many items.
                errors.push({
                  message: localization.getMaxItemsErrorMessage(contains.maxContains),
                  instanceLocation: Instance.uri(instance),
                  schemaLocations: [schemaLocation, maxContainsLocation]
                });
                continue;
              }
            }
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
  }
};

export default containsErrorHandler;
