import { getErrors } from "../../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../../index.d.ts"
 */

/** @type ErrorHandler */
const dependenciesErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
    if (typeof normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation] === "boolean") {
      continue;
    }

    const dependentSchemaOutputs = normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation];
    for (const dependentSchemaOutput of dependentSchemaOutputs) {
      const dependentSchemaErrors = await getErrors(dependentSchemaOutput, instance, localization);
      errors.push(...dependentSchemaErrors);
    }
  }

  return errors;
};

export default dependenciesErrorHandler;
