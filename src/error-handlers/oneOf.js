import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getErrors } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
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

    const alternatives = [];
    const instanceLocation = Instance.uri(instance);
    let matchCount = 0;

    for (const alternative of oneOf) {
      const typeErrors = alternative[instanceLocation]?.["https://json-schema.org/keyword/type"];
      const match = !typeErrors || Object.values(typeErrors).every((isValid) => isValid);

      if (match) {
        const alternativeErrors = await getErrors(alternative, instance, localization);
        if (alternativeErrors.length) {
          alternatives.push(alternativeErrors);
        } else {
          matchCount++;
        }
      }
    }

    if (matchCount === 0 && alternatives.length === 0) {
      for (const alternative of oneOf) {
        const alternativeErrors = await getErrors(alternative, instance, localization);
        if (alternativeErrors.length) {
          alternatives.push(alternativeErrors);
        } else {
          matchCount++;
        }
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

export default oneOfErrorHandler;
