import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const notErrorHandler = (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/not"]) {
    if (normalizedErrors["https://json-schema.org/keyword/not"][schemaLocation] === true) {
      continue;
    }

    errors.push({
      message: localization.getNotErrorMessage(),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    });
  }

  return errors;
};

export default notErrorHandler;
