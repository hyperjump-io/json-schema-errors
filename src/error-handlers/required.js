import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler } from "../index.d.ts"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 */

/** @type ErrorHandler */
const requiredErrorHandler = async (normalizedErrors, instance, localization, context={mode:"fail",negated:false}) => {
  if (context.mode === "pass") {
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/required"]) {
    const passed = normalizedErrors["https://json-schema.org/keyword/required"][schemaLocation];

    if (!passed) continue;

    const keyword = await getSchema(schemaLocation);
    const required = /** @type string[] */ (Schema.value(keyword));

    for (const propertyName of required) {
      if (Instance.has(propertyName, instance)) {
        errors.push({
          message: context.negated
            ? localization.getRequiredNegatedMessage(propertyName)
            : localization.getRequiredSuccessMessage(propertyName),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }
    }
  }

  return errors;
  }
  /** @type {Set<string>} */
  const allMissingRequired = new Set();
  const allSchemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/required"]) {
    if (normalizedErrors["https://json-schema.org/keyword/required"][schemaLocation]) {
      continue;
    }

    allSchemaLocations.push(schemaLocation);
    const keyword = await getSchema(schemaLocation);
    const required = /** @type string[] */ (Schema.value(keyword));

    addMissingProperties(required, instance, allMissingRequired);
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

      const requiredProperties = /** @type string[] */ (Schema.value(dependencyNode));
      addMissingProperties(requiredProperties, instance, allMissingRequired);
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
    if (typeof normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation] === "boolean") {
      continue;
    }

    const keyword = await getSchema(schemaLocation);

    let hasArrayFormDependencies = false;
    for await (const [propertyName, dependency] of Schema.entries(keyword)) {
      if (!Instance.has(propertyName, instance) || Schema.typeOf(dependency) !== "array") {
        continue;
      }

      hasArrayFormDependencies = true;
      const dependencyArray = /** @type {string[]} */ (Schema.value(dependency));
      addMissingProperties(dependencyArray, instance, allMissingRequired);
    }

    if (hasArrayFormDependencies) {
      allSchemaLocations.push(schemaLocation);
    }
  }

  if (allMissingRequired.size === 0) {
    return [];
  }

  return [{
    message: localization.getRequiredErrorMessage([...allMissingRequired]),
    instanceLocation: Instance.uri(instance),
    schemaLocations: /** @type {string[]} */ ([...allSchemaLocations])
  }];
};

/** @type (requiredProperties: string[], instance: JsonNode, missingSet: Set<string>) => void */
const addMissingProperties = (requiredProperties, instance, missingSet) => {
  for (const propertyName of requiredProperties) {
    if (!Instance.has(propertyName, instance)) {
      missingSet.add(propertyName);
    }
  }
};

export default requiredErrorHandler;
