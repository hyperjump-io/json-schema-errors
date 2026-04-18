import { getErrors } from "../../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../../index.d.ts"
 */

/** @type ErrorHandler */
const dependenciesErrorHandler = (normalizedErrors, instance, localization, ast) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
    if (typeof normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation] === "boolean") {
      continue;
    }

    const dependentSchemaOutputs = normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation];
    for (const dependentSchemaOutput of dependentSchemaOutputs) {
      const dependentSchemaErrors = getErrors(dependentSchemaOutput, instance, localization, ast);
      errors.push(...dependentSchemaErrors);
    }
  }

  return errors;
};

export default dependenciesErrorHandler;
