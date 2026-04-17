import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const patternErrorHandler = (normalizedErrors, instance, localization, resolver) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/pattern"]) {
    if (normalizedErrors["https://json-schema.org/keyword/pattern"][schemaLocation]) {
      continue;
    }

    const compiledPattern = resolver.getCompiledKeywordValue(schemaLocation);
    const pattern = /** @type RegExp */ (compiledPattern).source;

    errors.push({
      message: localization.getPatternErrorMessage(pattern),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    });
  }

  return errors;
};

export default patternErrorHandler;
