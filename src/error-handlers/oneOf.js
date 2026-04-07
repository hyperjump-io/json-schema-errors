import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Pact from "@hyperjump/pact";
import { getErrors } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, InstanceOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const oneOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/oneOf"]) {
    const oneOf = normalizedErrors["https://json-schema.org/keyword/oneOf"][schemaLocation];
    if (typeof oneOf === "boolean") {
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
      if (typeResults && !Object.values(typeResults).every((isValid) => isValid)) {
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
      const alternativeErrors = await getErrors(alternative, instance, localization);
      if (alternativeErrors.length) {
        alternatives.push(alternativeErrors);
      } else {
        matchCount++;
      }
    }

    if (matchCount === 0 && alternatives.length === 0) {
      for (const alternative of oneOf) {
        const alternativeErrors = await getErrors(alternative, instance, localization);
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
};

/** @type (alternative: InstanceOutput | undefined) => boolean */
const isPassingProperty = (propertyOutput) => {
  if (!propertyOutput) {
    return false;
  }

  for (const keywordUri in propertyOutput) {
    for (const schemaLocation in propertyOutput[keywordUri]) {
      if (propertyOutput[keywordUri][schemaLocation] !== true) {
        return false;
      }
    }
  }

  return true;
};

export default oneOfErrorHandler;
