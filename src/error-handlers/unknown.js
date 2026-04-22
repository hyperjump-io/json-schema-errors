import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { pointerSegments } from "@hyperjump/json-pointer";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const unknownErrorHandler = (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/unknown"]) {
    if (normalizedErrors["https://json-schema.org/keyword/unknown"][schemaLocation]) {
      continue;
    }

    const keyword = /** @type string */ ([...pointerSegments(decodeURI(schemaLocation.split("#")[1]))].pop());

    errors.push({
      message: localization.getUnknownErrorMessage(keyword),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    });
  }

  return errors;
};

export default unknownErrorHandler;
