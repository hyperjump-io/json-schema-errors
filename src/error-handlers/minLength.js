import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minLengthErrorHandler = (normalizedErrors, instance, localization, ast) => {
  /** @type ErrorObject[] */
  const errors = [];
  let highestMinLength = -Infinity;
  let mostConstrainingLocation = null;

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minLength"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minLength"][schemaLocation]) {
      continue;
    }

    const minLength = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

    if (minLength > highestMinLength) {
      highestMinLength = minLength;
      mostConstrainingLocation = schemaLocation;
    }
  }
  if (mostConstrainingLocation !== null) {
    errors.push({
      message: localization.getMinLengthErrorMessage(highestMinLength),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [mostConstrainingLocation]
    });
  }

  return errors;
};

export default minLengthErrorHandler;
