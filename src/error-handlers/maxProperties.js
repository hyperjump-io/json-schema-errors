import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxPropertiesErrorHandler = (normalizedErrors, instance, localization, ast) => {
  /** @type ErrorObject[] */
  const errors = [];
  let lowestMaxProperties = Infinity;
  let mostConstrainingLocation = null;
  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxProperties"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maxProperties"][schemaLocation]) {
      continue;
    }

    const maxProperties = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

    if (maxProperties < lowestMaxProperties) {
      lowestMaxProperties = maxProperties;
      mostConstrainingLocation = schemaLocation;
    }
  }
  if (mostConstrainingLocation !== null) {
    errors.push({
      message: localization.getMaxPropertiesErrorMessage(lowestMaxProperties),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [mostConstrainingLocation]
    });
  }

  return errors;
};

export default maxPropertiesErrorHandler;
