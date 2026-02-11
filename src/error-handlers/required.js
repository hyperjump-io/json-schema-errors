import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler } from "../index.d.ts"
 */

/** @type ErrorHandler */
const requiredErrorHandler = async (normalizedErrors, instance, localization) => {
  const allMissingRequired = new Set();
  const allSchemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/required"]) {
    if (normalizedErrors["https://json-schema.org/keyword/required"][schemaLocation]) {
      continue;
    }

    allSchemaLocations.push(schemaLocation);
    const keyword = await getSchema(schemaLocation);
    const required = /** @type string[] */ (Schema.value(keyword));

    for (const propertyName of required) {
      if (!Instance.has(propertyName, instance)) {
        allMissingRequired.add(propertyName);
      }
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/dependentRequired"]) {
    if (normalizedErrors["https://json-schema.org/keyword/dependentRequired"][schemaLocation]) {
      continue;
    }

    allSchemaLocations.push(schemaLocation);
    const keyword = await getSchema(schemaLocation);

    for await (const [propertyName, dependencyNode] of Schema.entries(keyword)) {
      if (!Instance.has(propertyName, instance)) {
        continue;
      }

      if (Schema.typeOf(dependencyNode) !== "array") {
        continue;
      }

      const requiredProperties = /** @type string[] */ (Schema.value(dependencyNode));
      for (const requiredPropertyName of requiredProperties) {
        if (!Instance.has(requiredPropertyName, instance)) {
          allMissingRequired.add(requiredPropertyName);
        }
      }
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
    if (typeof normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation] === "boolean") {
      continue;
    }

    const keyword = await getSchema(schemaLocation);

    let hasArrayFormDependencies = false;
    for await (const [propertyName, dependency] of Schema.entries(keyword)) {
      if (!Instance.has(propertyName, instance)) {
        continue;
      }

      if (Schema.typeOf(dependency) !== "array") {
        continue;
      }

      hasArrayFormDependencies = true;
      const dependencyArray = /** @type {string[]} */ (Schema.value(dependency));
      for (const requiredPropertyName of dependencyArray) {
        if (!Instance.has(requiredPropertyName, instance)) {
          allMissingRequired.add(requiredPropertyName);
        }
      }
    }

    if (hasArrayFormDependencies) {
      allSchemaLocations.push(schemaLocation);
    }
  }

  if (allMissingRequired.size === 0) {
    return [];
  }

  /** @type {string[]} */
  const missingProperties = [...allMissingRequired];
  /** @type {string[]} */
  const locations = [...allSchemaLocations];

  return [{
    message: localization.getRequiredErrorMessage(missingProperties),
    instanceLocation: Instance.uri(instance),
    schemaLocations: locations
  }];
};

export default requiredErrorHandler;
