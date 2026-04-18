import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minPropertiesErrorHandler = (normalizedErrors, instance, localization, ast) => {
  /** @type ErrorObject[] */
  const errors = [];

  let highestMinProperties = -Infinity;
  let mostConstrainingLocation = null;

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minProperties"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minProperties"][schemaLocation]) {
      continue;
    }

    const minProperties = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

    if (minProperties > highestMinProperties) {
      highestMinProperties = minProperties;
      mostConstrainingLocation = schemaLocation;
    }
  }

  if (mostConstrainingLocation !== null) {
    errors.push({
      message: localization.getMinPropertiesErrorMessage(highestMinProperties),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [mostConstrainingLocation]
    });
  }

  return errors;
};

export default minPropertiesErrorHandler;
