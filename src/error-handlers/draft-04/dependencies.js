import { getSchema } from "@hyperjump/json-schema/experimental";
import { getErrors } from "../../json-schema-errors.js";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject, NormalizedOutput } from "../../index.d.ts"
 */

/** @type ErrorHandler */
const dependenciesErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation] === true) {
      continue;
    }

    if (normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation]) {
      const outputs = /** @type {NormalizedOutput[]} */ (normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation]);
      for (const output of outputs) {
        const result = await getErrors(output, instance, localization);
        errors.push(...result);
      }
    }

    const compiled = await getSchema(schemaLocation);
    const dependencies = /** @type {Record<string, string | string[]>} */ (Schema.value(compiled));

    for (const property in dependencies) {
      if (!Instance.has(property, instance)) {
        continue;
      }

      if (Array.isArray(dependencies[property])) {
        const missing = dependencies[property].filter((required) => !Instance.has(required, instance));
        errors.push({
          message: localization.getRequiredErrorMessage(missing),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }
    }
  }

  return errors;
};

export default dependenciesErrorHandler;
