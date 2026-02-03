import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const dependentRequiredErrorHandler = async (normalizedErrors, instance, localization) => {
  if (normalizedErrors["https://json-schema.org/keyword/required"]) {
    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/required"]) {
      if (normalizedErrors["https://json-schema.org/keyword/required"][schemaLocation] === false) {
        return [];
      }
    }
  }

  /** @type ErrorObject[] */
  const errors = [];

  const dependentRequiredErrors = normalizedErrors["https://json-schema.org/keyword/dependentRequired"];
  if (!dependentRequiredErrors) {
    return [];
  }

  for (const schemaLocation in dependentRequiredErrors) {
    if (dependentRequiredErrors[schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const dependentRequired = /** @type Record<string, string[]> */ (Schema.value(keyword));

    /** @type Set<string> */
    const required = new Set();
    for (const propertyName in dependentRequired) {
      if (Instance.has(propertyName, instance)) {
        for (const requiredPropertyName of dependentRequired[propertyName]) {
          if (!Instance.has(requiredPropertyName, instance)) {
            required.add(requiredPropertyName);
          }
        }
      }
    }

    if (required.size > 0) {
      errors.push({
        message: localization.getRequiredErrorMessage([...required].sort()),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }
  }

  return errors;
};

export default dependentRequiredErrorHandler;
