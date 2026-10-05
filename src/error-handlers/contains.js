import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { allTrue, allowsAnyValue, countTrue, describeEach, getCompiledKeywordValue, getPlaceholder, getSiblingKeywordLocation, getSuccesses, isFailing, isPassing, limitItems, negate, someTrue } from "../json-schema-errors.js";

/**
 * @import { ContainsAst } from "../normalization-handlers/contains.js"
 * @import { ContainsRange, ErrorHandler, ErrorHandlerContext, ErrorObject, NormalizedOutput } from "../index.d.ts"
 */

const keywordUris = [
  "https://json-schema.org/keyword/contains",
  "https://json-schema.org/keyword/draft-06/contains"
];

/** @type ErrorHandler */
const containsErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const keywordUri of keywordUris) {
      for (const schemaLocation in normalizedErrors[keywordUri]) {
        const containsOutput = normalizedErrors[keywordUri][schemaLocation];
        if (containsOutput.valid !== false) {
          continue;
        }

        /** @type string[] */
        const schemaLocations = [schemaLocation];

        const contains = /** @type ContainsAst */ (getCompiledKeywordValue(context.ast, schemaLocation));

        /** @type ContainsRange */
        const range = {};
        if (typeof contains !== "string") {
          if (contains.minContains !== 1) {
            range.minContains = contains.minContains;
            const minContainsLocation = getSiblingKeywordLocation(context.ast, schemaLocation, "https://json-schema.org/keyword/minContains");
            schemaLocations.push(minContainsLocation);
          }

          if (contains.maxContains !== Number.MAX_SAFE_INTEGER) {
            range.maxContains = contains.maxContains;
            const maxContainsLocation = getSiblingKeywordLocation(context.ast, schemaLocation, "https://json-schema.org/keyword/maxContains");
            schemaLocations.push(maxContainsLocation);

            // Too many items matched. Report on each matching item how it
            // satisfied the 'contains' schema so the user knows what needs to change.
            const items = [...Instance.iter(instance)];
            const itemOutputs = containsOutput.outputs ?? [];
            const matches = items.flatMap((item, index) => {
              const itemOutput = itemOutputs[index];
              return itemOutput && isPassing(itemOutput) ? [{ item, itemOutput }] : [];
            });
            if (matches.length > contains.maxContains) {
              const descriptions = matches.map(({ itemOutput }) => {
                return getSuccesses(itemOutput, instance, context);
              });

              // If any match can't be described, the errors would be misleading
              if (descriptions.every((description) => description.length > 0)) {
                matches.forEach(({ item }, index) => {
                  errors.push({
                    message: context.localization.getContainsTooManyErrorMessage(contains.maxContains),
                    alternatives: [limitItems(descriptions[index], item, context)],
                    instanceLocation: Instance.uri(item),
                    schemaLocations: [schemaLocation, maxContainsLocation]
                  });
                });
                continue;
              } else if (matches.length === itemOutputs.length) {
                // Every item matched and there's nothing to say about why, so the
                // problem is effectively that there are too many items.
                errors.push({
                  message: context.localization.getMaxItemsErrorMessage(contains.maxContains),
                  instanceLocation: Instance.uri(instance),
                  schemaLocations: [schemaLocation, maxContainsLocation]
                });
                continue;
              }
            }
          }
        }

        // Describe what an item would need to be like using an item that doesn't exist
        const containsLocation = typeof contains === "string" ? contains : contains.contains;
        const item = getPlaceholder(instance, String(Instance.length(instance)));
        const description = describeEach(containsLocation, item, instance, context);

        if (description.length > 0) {
          errors.push({
            message: context.localization.getContainsErrorMessage(range, true),
            alternatives: [limitItems(description, instance, context)],
            instanceLocation: Instance.uri(instance),
            schemaLocations: schemaLocations
          });
        } else if (allowsAnyValue(containsLocation, context.ast)) {
          // Any item matches, so there aren't enough items
          errors.push({
            message: context.localization.getMinItemsErrorMessage(range.minContains ?? 1),
            instanceLocation: Instance.uri(instance),
            schemaLocations: schemaLocations
          });
        } else {
          errors.push({
            message: context.localization.getContainsErrorMessage(range, false),
            instanceLocation: Instance.uri(instance),
            schemaLocations: schemaLocations
          });
        }
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const keywordUri of keywordUris) {
      for (const schemaLocation in normalizedOutput[keywordUri]) {
        const itemOutputs = normalizedOutput[keywordUri][schemaLocation].outputs ?? [];

        const contains = /** @type ContainsAst | string */ (getCompiledKeywordValue(context.ast, schemaLocation));
        const minContains = typeof contains === "string" ? 1 : contains.minContains;
        const maxContains = typeof contains === "string" || contains.maxContains === Number.MAX_SAFE_INTEGER
          ? Infinity
          : contains.maxContains;

        const isKnown = itemOutputs.every((itemOutput) => isPassing(itemOutput) || isFailing(itemOutput));
        const matching = itemOutputs.filter(isPassing);
        const notMatching = itemOutputs.filter((itemOutput) => !isPassing(itemOutput));

        /** @type (itemOutput: NormalizedOutput, context: ErrorHandlerContext) => ErrorObject[] */
        const describe = (itemOutput, context) => getSuccesses(itemOutput, instance, context);

        if (context.localization.isNegated) {
          // 'contains' fails if too few items match or too many items match
          if (isKnown) {
            // Make enough of the matching items fail
            const itemOptions = matching.map((itemOutput) => describe(itemOutput, context));
            if (minContains > 0 && itemOptions.every((options) => options.length > 0)) {
              const failCount = matching.length - minContains + 1;
              if (matching.length === 1 && failCount === 1) {
                successes.push(...itemOptions[0]);
              } else {
                const items = itemOptions.map((options) => {
                  return someTrue(options.map((option) => [option]), instance, schemaLocation, context);
                });
                const requirements = countTrue(items, { min: failCount }, instance, schemaLocation, context);
                successes.push(...allTrue(requirements, instance, schemaLocation, context));
              }
            }

            // Make enough of the other items match
            const matchCount = maxContains - matching.length + 1;
            const descriptions = notMatching.map((itemOutput) => describe(itemOutput, negate(context)));
            if (matchCount <= notMatching.length && descriptions.every((description) => description.length > 0)) {
              const requirements = countTrue(descriptions, { min: matchCount }, instance, schemaLocation, context);
              successes.push(...allTrue(requirements, instance, schemaLocation, context));
            }
          } else {
            const descriptions = itemOutputs.map((itemOutput) => describe(itemOutput, negate(context)));
            if (descriptions.length > 0 && descriptions.every((description) => description.length > 0)) {
              if (minContains > 0) {
                const requirements = countTrue(descriptions, { max: minContains - 1 }, instance, schemaLocation, context);
                successes.push(...allTrue(requirements, instance, schemaLocation, context));
              }

              if (maxContains < descriptions.length) {
                const requirements = countTrue(descriptions, { min: maxContains + 1 }, instance, schemaLocation, context);
                successes.push(...allTrue(requirements, instance, schemaLocation, context));
              }
            }
          }
        } else {
          if (isKnown) {
            const descriptions = matching.map((itemOutput) => describe(itemOutput, context));
            if (descriptions.every((description) => description.length > 0)) {
              successes.push(...descriptions.flat());
            }
          } else {
            const descriptions = itemOutputs.map((itemOutput) => describe(itemOutput, context));
            if (descriptions.every((description) => description.length > 0)) {
              successes.push(...countTrue(descriptions, { min: minContains, max: maxContains }, instance, schemaLocation, context));
            }
          }
        }
      }
    }

    return successes;
  }
};

export default containsErrorHandler;
