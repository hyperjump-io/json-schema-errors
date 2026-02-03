import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const requiredErrorHandler = async (normalizedErrors, instance, localization) => {
  const allMissingRequired = new Set();
  const allSchemaLocations = new Set();
  let hasRequiredFailure = false;

  const requiredErrors = normalizedErrors["https://json-schema.org/keyword/required"];
  if (requiredErrors) {
    for (const schemaLocation in requiredErrors) {
      if (requiredErrors[schemaLocation] === false) {
        hasRequiredFailure = true;
        allSchemaLocations.add(schemaLocation);
        const keyword = await getSchema(schemaLocation);
        const required = /** @type string[] */ (Schema.value(keyword));

        for (const propertyName of required) {
          if (!Instance.has(propertyName, instance)) {
            allMissingRequired.add(propertyName);
          }
        }
      }
    }
  }

  if (hasRequiredFailure) {
    const dependentRequiredErrors = normalizedErrors["https://json-schema.org/keyword/dependentRequired"];
    if (dependentRequiredErrors) {
      for (const schemaLocation in dependentRequiredErrors) {
        if (dependentRequiredErrors[schemaLocation] === false) {
          allSchemaLocations.add(schemaLocation);
          const keyword = await getSchema(schemaLocation);
          const dependentRequired = /** @type Record<string, string[]> */ (Schema.value(keyword));

          for (const propertyName in dependentRequired) {
            if (Instance.has(propertyName, instance)) {
              for (const requiredPropertyName of dependentRequired[propertyName]) {
                if (!Instance.has(requiredPropertyName, instance)) {
                  allMissingRequired.add(requiredPropertyName);
                }
              }
            }
          }
        }
      }
    }
  }

  if (allMissingRequired.size > 0) {
    /** @type {string[]} */
    const missingProperties = [...allMissingRequired].sort();

    /** @type {string[]} */
    const locations = [...allSchemaLocations].sort();

    return [{
      message: localization.getRequiredErrorMessage(missingProperties),
      instanceLocation: Instance.uri(instance),
      schemaLocations: locations
    }];
  }

  return [];
};

export default requiredErrorHandler;
