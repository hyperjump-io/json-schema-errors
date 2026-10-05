import { getCompiledKeywordValue, getErrors } from "../../json-schema-errors.js";
import { describeSchemaDependencies } from "../dependentSchemas.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../../index.d.ts"
 */

/** @type ErrorHandler */
const dependenciesErrorHandler = {
  error: (normalizedErrors, instance, localization, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
      if (normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation].valid !== false) {
        continue;
      }

      const dependentSchemaOutputs = normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation].outputs ?? [];
      for (const dependentSchemaOutput of dependentSchemaOutputs) {
        const dependentSchemaErrors = getErrors(dependentSchemaOutput, instance, localization, context);
        errors.push(...dependentSchemaErrors);
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/draft-04/dependencies"]) {
      // Array-form dependencies are handled with 'required'
      const dependencies = /** @type [string, string | string[]][] */ (getCompiledKeywordValue(context.ast, schemaLocation));
      const schemaDependencies = /** @type [string, string][] */ (dependencies.filter(([, dependency]) => typeof dependency === "string"));
      const outputs = normalizedOutput["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation].outputs ?? [];
      successes.push(...describeSchemaDependencies(schemaDependencies, outputs, instance, localization, context));
    }

    return successes;
  }
};

export default dependenciesErrorHandler;
