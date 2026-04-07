import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as Pact from "@hyperjump/pact";
import { getErrors } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, InstanceOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const anyOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/anyOf"]) {
    const anyOf = normalizedErrors["https://json-schema.org/keyword/anyOf"][schemaLocation];
    if (typeof anyOf === "boolean") {
      continue;
    }

    const propertyLocations = Pact.pipe(
      Instance.values(instance),
      Pact.map(Instance.uri),
      Pact.collectArray
    );

    const discriminators = propertyLocations.filter((propertyLocation) => {
      return anyOf.some((alternative) => isPassingProperty(alternative[propertyLocation]));
    });

    /** @type ErrorObject[][] */
    const alternatives = [];
    const instanceLocation = Instance.uri(instance);

    for (const alternative of anyOf) {
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
      alternatives.push(await getErrors(alternative, instance, localization));
    }

    // If all alternatives were filtered out, default to returning all of them
    if (alternatives.length === 0) {
      for (const alternative of anyOf) {
        alternatives.push(await getErrors(alternative, instance, localization));
      }
    }

    if (alternatives.length === 1) {
      errors.push(...alternatives[0]);
    } else {
      errors.push({
        message: localization.getAnyOfErrorMessage(),
        alternatives,
        instanceLocation,
        schemaLocations: [schemaLocation]
      });
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

export default anyOfErrorHandler;
