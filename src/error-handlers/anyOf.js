import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Pact from "@hyperjump/pact";
import { allTrue, flattenOutput, getErrors, getSuccesses, someTrue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, InstanceOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const anyOfErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/anyOf"]) {
      const anyOfOutput = normalizedErrors["https://json-schema.org/keyword/anyOf"][schemaLocation];
      if (anyOfOutput.valid !== false) {
        continue;
      }
      const anyOf = anyOfOutput.outputs ?? [];

      const propertyLocations = Pact.pipe(
        Instance.values(instance),
        Pact.map(Instance.uri),
        Pact.collectArray
      );

      const alternativeResults = anyOf.map(flattenOutput);
      const discriminators = propertyLocations.filter((propertyLocation) => {
        return alternativeResults.some((results) => isPassingProperty(results[propertyLocation]));
      });

      /** @type ErrorObject[][] */
      const alternatives = [];
      const instanceLocation = Instance.uri(instance);

      for (const [index, alternative] of anyOf.entries()) {
        const results = alternativeResults[index];

        // Filter alternatives whose declared type doesn't match the instance type
        const typeResults = results[instanceLocation]?.["https://json-schema.org/keyword/type"];
        if (typeResults && !Object.values(typeResults).every(({ valid }) => valid)) {
          continue;
        }

        if (Instance.typeOf(instance) === "object") {
          // Filter alternative if it has no declared properties in common with the instance
          if (!propertyLocations.some((propertyLocation) => propertyLocation in results)) {
            continue;
          }

          // Filter alternative if it has failing properties that are declared and passing in another alternative
          if (discriminators.some((propertyLocation) => !isPassingProperty(results[propertyLocation]))) {
            continue;
          }
        }

        // The alternative passed all the filters
        alternatives.push(getErrors(alternative, instance, context));
      }

      // If all alternatives were filtered out, default to returning all of them
      if (alternatives.length === 0) {
        for (const alternative of anyOf) {
          alternatives.push(getErrors(alternative, instance, context));
        }
      }

      if (alternatives.length === 1) {
        errors.push(...alternatives[0]);
      } else {
        errors.push({
          message: context.localization.getAnyOfErrorMessage(),
          alternatives,
          instanceLocation,
          schemaLocations: [schemaLocation]
        });
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/anyOf"]) {
      const alternatives = normalizedOutput["https://json-schema.org/keyword/anyOf"][schemaLocation].outputs ?? [];

      if (context.localization.isNegated) {
        // 'anyOf' fails if all of its alternatives fail. An alternative fails if
        // at least one of its keywords fails. Changing the value to make one
        // alternative fail could make another one pass, so all of them need to
        // be described even if some of them fail now.
        const alternativeOptions = alternatives.map((alternative) => {
          return getSuccesses(alternative, instance, context);
        });

        // An alternative that can't be described means we can't say how to make it fail
        if (alternativeOptions.some((options) => options.length === 0)) {
          continue;
        }

        if (alternativeOptions.length === 1) {
          successes.push(...alternativeOptions[0]);
        } else {
          const requirements = alternativeOptions.flatMap((options) => {
            return someTrue(options.map((option) => [option]), instance, schemaLocation, context);
          });
          successes.push(...allTrue(requirements, instance, schemaLocation, context));
        }
      } else {
        // Passes if at least one alternative passes. All of them are described,
        // even if we know which ones match, because these descriptions tell the
        // user what would need to change to make 'anyOf' fail.
        const descriptions = alternatives.map((alternative) => {
          return getSuccesses(alternative, instance, context);
        });

        if (descriptions.some((description) => description.length === 0)) {
          continue;
        }

        successes.push(...someTrue(descriptions, instance, schemaLocation, context));
      }
    }

    return successes;
  }
};

/** @type (alternative: InstanceOutput | undefined) => boolean */
const isPassingProperty = (propertyOutput) => {
  if (!propertyOutput) {
    return false;
  }

  for (const keywordUri in propertyOutput) {
    for (const schemaLocation in propertyOutput[keywordUri]) {
      if (propertyOutput[keywordUri][schemaLocation].valid !== true) {
        return false;
      }
    }
  }

  return true;
};

export default anyOfErrorHandler;
