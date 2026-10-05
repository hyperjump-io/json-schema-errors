import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { pointerSegments } from "@hyperjump/json-pointer";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/**
 * Unknown keywords are only reported if the validator's output says they failed.
 * There's no `success` handler because we don't know what an unknown keyword
 * requires, so it must never be included in a description of what passed or
 * what would make it fail.
 *
 * @type ErrorHandler
 */
const unknownErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/unknown"]) {
      if (normalizedErrors["https://json-schema.org/keyword/unknown"][schemaLocation].valid !== false) {
        continue;
      }

      const keyword = /** @type string */ ([...pointerSegments(decodeURI(schemaLocation.split("#")[1]))].pop());

      errors.push({
        message: context.localization.getUnknownErrorMessage(keyword),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return errors;
  }
};

export default unknownErrorHandler;
