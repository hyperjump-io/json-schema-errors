import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Pact from "@hyperjump/pact";
import { allowsAnyValue, allTrue, countTrue, flattenOutput, getCompiledKeywordValue, getErrors, getSuccesses, isPassing, limitItems, limitOptions, negate, someTrue } from "../json-schema-errors.js";

/**
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { ErrorHandler, ErrorHandlerContext, ErrorObject, InstanceOutput, NormalizedOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const oneOfErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/oneOf"]) {
      const oneOfOutput = normalizedErrors["https://json-schema.org/keyword/oneOf"][schemaLocation];
      if (oneOfOutput.valid !== false) {
        continue;
      }
      const oneOf = oneOfOutput.outputs ?? [];

      const alternativeLocations = /** @type string[] */ (getCompiledKeywordValue(context.ast, schemaLocation));
      const matches = alternativeLocations.flatMap((alternativeLocation, index) => {
        return isPassing(oneOf[index]) ? [{ alternativeLocation, output: oneOf[index] }] : [];
      });
      if (matches.length > 1) {
        errors.push(multipleMatchesError(matches, schemaLocation, instance, context));
        continue;
      }

      const propertyLocations = Pact.pipe(
        Instance.values(instance),
        Pact.map(Instance.uri),
        Pact.collectArray
      );

      const alternativeResults = oneOf.map(flattenOutput);
      const discriminators = propertyLocations.filter((propertyLocation) => {
        return alternativeResults.some((results) => isPassingProperty(results[propertyLocation]));
      });

      const alternatives = [];
      const instanceLocation = Instance.uri(instance);

      for (const [index, alternative] of oneOf.entries()) {
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
        const alternativeErrors = getErrors(alternative, instance, context);
        if (alternativeErrors.length) {
          alternatives.push(alternativeErrors);
        }
      }

      // If all alternatives were filtered out, default to returning all of them
      if (alternatives.length === 0) {
        for (const alternative of oneOf) {
          const alternativeErrors = getErrors(alternative, instance, context);
          if (alternativeErrors.length) {
            alternatives.push(alternativeErrors);
          }
        }
      }

      if (alternatives.length === 1) {
        errors.push(...alternatives[0]);
      } else {
        /** @type ErrorObject */
        const alternativeErrors = {
          message: context.localization.getOneOfErrorMessage(),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        };
        if (alternatives.length) {
          alternativeErrors.alternatives = alternatives;
        }
        errors.push(alternativeErrors);
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/oneOf"]) {
      const alternatives = normalizedOutput["https://json-schema.org/keyword/oneOf"][schemaLocation].outputs ?? [];

      if (context.localization.isNegated) {
        // 'oneOf' fails if no alternatives match or more than one matches. Changing
        // the value could change which alternatives match, so all of them need to
        // be described even if we know which one matches now.

        // Make all alternatives fail
        const alternativeOptions = alternatives.map((alternative) => getSuccesses(alternative, instance, context));
        if (alternativeOptions.every((alternativeOption) => alternativeOption.length > 0)) {
          const requirements = alternativeOptions.flatMap((alternativeOption) => {
            return someTrue(alternativeOption.map((option) => [option]), instance, schemaLocation, context);
          });
          successes.push(...allTrue(requirements, instance, schemaLocation, context));
        }

        // Make at least two alternatives match
        const descriptions = alternatives.map((alternative) => getSuccesses(alternative, instance, negate(context)));
        if (descriptions.every((description) => description.length > 0)) {
          const requirements = countTrue(descriptions, { min: 2 }, instance, schemaLocation, negate(context));
          successes.push(...allTrue(requirements, instance, schemaLocation, context));
        }
      } else {
        // Passes if exactly one alternative passes. All of them are described, even
        // if we know which one matches, because these descriptions tell the user
        // what would need to change to make 'oneOf' fail.
        const descriptions = alternatives.map((alternative) => getSuccesses(alternative, instance, context));
        if (descriptions.every((description) => description.length > 0)) {
          successes.push(...countTrue(descriptions, { min: 1, max: 1 }, instance, schemaLocation, context));
        }
      }
    }

    return successes;
  }
};

/**
 * More than one alternative passed. Describe how the instance satisfied each
 * matching alternative so the user knows what needs to change.
 *
 * @type (matches: { alternativeLocation: string, output: NormalizedOutput }[], schemaLocation: string, instance: JsonNode, context: ErrorHandlerContext) => ErrorObject
 */
const multipleMatchesError = (matches, schemaLocation, instance, context) => {
  const alternatives = matches.map(({ alternativeLocation, output }) => {
    const description = getSuccesses(output, instance, context);
    if (description.length === 0 && allowsAnyValue(alternativeLocation, context.ast)) {
      return [{
        message: context.localization.getAnyValueMessage(),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [alternativeLocation]
      }];
    } else {
      return description;
    }
  });

  // If any match can't be described, the alternatives would be misleading
  if (alternatives.some((alternative) => alternative.length === 0)) {
    return {
      message: context.localization.getOneOfTooManyErrorMessage(),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    };
  }

  return {
    message: context.localization.getOneOfMultipleMatchesErrorMessage(),
    // Options are shown in the same order as the alternatives
    alternatives: limitOptions(removeCommonSuccesses(alternatives).map((alternative) => {
      return limitItems(alternative, instance, context);
    }), instance, context, false),
    instanceLocation: Instance.uri(instance),
    schemaLocations: [schemaLocation]
  };
};

/**
 * Anything true in every matching alternative doesn't help the user figure out
 * how to make only one alternative match. Remove those unless it would leave an
 * alternative with nothing to say.
 *
 * @type (alternatives: ErrorObject[][]) => ErrorObject[][]
 */
const removeCommonSuccesses = (alternatives) => {
  /** @type (success: ErrorObject) => string */
  const key = (success) => `${success.instanceLocation}\0${success.message}`;

  const [first, ...rest] = alternatives.map((alternative) => new Set(alternative.map(key)));
  const common = rest.reduce((acc, keys) => acc.intersection(keys), first);

  const reduced = alternatives.map((alternative) => {
    return alternative.filter((success) => !common.has(key(success)));
  });

  return reduced.some((alternative) => alternative.length === 0) ? alternatives : reduced;
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

export default oneOfErrorHandler;
