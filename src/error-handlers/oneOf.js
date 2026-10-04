import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Pact from "@hyperjump/pact";
import { getErrors, getSuccesses, isPassing } from "../json-schema-errors.js";

/**
 * @import { AST } from "@hyperjump/json-schema/experimental"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { ErrorHandler, ErrorObject, InstanceOutput, Localization, NormalizedOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const oneOfErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/oneOf"]) {
      const oneOfOutput = normalizedErrors["https://json-schema.org/keyword/oneOf"][schemaLocation];
      if (oneOfOutput.valid !== false) {
        continue;
      }
      const oneOf = oneOfOutput.outputs ?? [];

      const matches = oneOf.filter(isPassing);
      if (matches.length > 1) {
        errors.push(multipleMatchesError(matches, schemaLocation, instance, localization, ast));
        continue;
      }

      const propertyLocations = Pact.pipe(
        Instance.values(instance),
        Pact.map(Instance.uri),
        Pact.collectArray
      );

      const discriminators = propertyLocations.filter((propertyLocation) => {
        return oneOf.some((alternative) => isPassingProperty(alternative[propertyLocation]));
      });

      const alternatives = [];
      const instanceLocation = Instance.uri(instance);
      let matchCount = 0;

      for (const alternative of oneOf) {
        // Filter alternatives whose declared type doesn't match the instance type
        const typeResults = alternative[instanceLocation]?.["https://json-schema.org/keyword/type"];
        if (typeResults && !Object.values(typeResults).every(({ valid }) => valid)) {
          continue;
        }

        if (Instance.typeOf(instance) === "object") {
          // Filter alternative if it has no declared properties in common with the instance
          if (!propertyLocations.some((propertyLocation) => propertyLocation in alternative)) {
            continue;
          }

          // Filter alternative if it has failing properties that are declared and passing in another alternative
          if (discriminators.some((propertyLocation) => !isPassingProperty(alternative[propertyLocation]))) {
            continue;
          }
        }

        // The alternative passed all the filters
        const alternativeErrors = getErrors(alternative, instance, localization, ast);
        if (alternativeErrors.length) {
          alternatives.push(alternativeErrors);
        } else {
          matchCount++;
        }
      }

      if (matchCount === 0 && alternatives.length === 0) {
        for (const alternative of oneOf) {
          const alternativeErrors = getErrors(alternative, instance, localization, ast);
          alternatives.push(alternativeErrors);
        }
      }

      if (alternatives.length === 1 && matchCount === 0) {
        errors.push(...alternatives[0]);
      } else {
        /** @type ErrorObject */
        const alternativeErrors = {
          message: localization.getOneOfErrorMessage(matchCount),
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
  }
};

/**
 * More than one alternative passed. Describe how the instance satisfied each
 * matching alternative so the user knows what needs to change.
 *
 * @type (matches: NormalizedOutput[], schemaLocation: string, instance: JsonNode, localization: Localization, ast: AST) => ErrorObject
 */
const multipleMatchesError = (matches, schemaLocation, instance, localization, ast) => {
  const alternatives = matches.map((match) => getSuccesses(match, instance, localization, ast));

  // If any match can't be described, the alternatives would be misleading
  if (alternatives.some((alternative) => alternative.length === 0)) {
    return {
      message: localization.getOneOfErrorMessage(matches.length),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    };
  }

  return {
    message: localization.getOneOfMultipleMatchesErrorMessage(),
    alternatives: removeCommonSuccesses(alternatives),
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
