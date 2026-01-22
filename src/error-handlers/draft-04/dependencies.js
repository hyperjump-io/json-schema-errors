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
    if (typeof normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation] === "boolean") {
      continue;
    }

    const outputs = normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation];
    for (const output of outputs) {
      const result = await getErrors(output, instance, localization);
      errors.push(...result);
    }

    const dependencies = await getSchema(schemaLocation);
    for await (const [property, dependency] of Schema.entries(dependencies)) {
      if (!Instance.has(property, instance)) {
        continue;
      }

      if (Schema.typeOf(dependency) === "array") {
        const dependentRequired = /** @type {string[]} */ (Schema.value(dependency));
        const missing = dependentRequired.filter((required) => !Instance.has(required, instance));
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
