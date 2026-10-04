import { getErrors, getSuccesses } from "../../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../../index.d.ts"
 */

/** @type ErrorHandler */
const dependenciesErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
      if (normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation].valid !== false) {
        continue;
      }

      const dependentSchemaOutputs = normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation].outputs ?? [];
      for (const dependentSchemaOutput of dependentSchemaOutputs) {
        const dependentSchemaErrors = getErrors(dependentSchemaOutput, instance, localization, ast);
        errors.push(...dependentSchemaErrors);
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    // Only dependencies whose property is present are included. They all have to
    // pass, so they're described like 'allOf'.
    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/draft-04/dependencies"]) {
      for (const dependentSchemaOutput of normalizedOutput["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation].outputs ?? []) {
        successes.push(...getSuccesses(dependentSchemaOutput, instance, localization, ast));
      }
    }

    return successes;
  }
};

export default dependenciesErrorHandler;
