import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 */

/** @type ErrorHandler */
const requiredErrorHandler = {
  error: (normalizedErrors, instance, localization, context) => {
    /** @type {Set<string>} */
    const allMissingRequired = new Set();
    const allSchemaLocations = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/required"]) {
      if (normalizedErrors["https://json-schema.org/keyword/required"][schemaLocation].valid !== false) {
        continue;
      }

      allSchemaLocations.push(schemaLocation);
      const required = /** @type string[] */ (getCompiledKeywordValue(context.ast, schemaLocation));

      addMissingProperties(required, instance, allMissingRequired);
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/dependentRequired"]) {
      if (normalizedErrors["https://json-schema.org/keyword/dependentRequired"][schemaLocation].valid !== false) {
        continue;
      }

      allSchemaLocations.push(schemaLocation);
      const dependencies = /** @type {[string, string[]][]} */ (getCompiledKeywordValue(context.ast, schemaLocation));

      for (const [propertyName, requiredProperties] of dependencies) {
        if (!Instance.has(propertyName, instance)) {
          continue;
        }
        addMissingProperties(requiredProperties, instance, allMissingRequired);
      }
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
      if (normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation].valid !== false) {
        continue;
      }

      const dependencies = /** @type {[string, unknown][]} */ (getCompiledKeywordValue(context.ast, schemaLocation));

      let hasArrayFormDependencies = false;
      for (const [propertyName, dependency] of dependencies) {
        if (!Instance.has(propertyName, instance) || !Array.isArray(dependency)) {
          continue;
        }

        hasArrayFormDependencies = true;
        const dependencyArray = /** @type {string[]} */ (dependency);
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
  },

  success: (normalizedOutput, instance, localization, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    /** @type {Set<string>} */
    const allRequired = new Set();
    const requiredSchemaLocations = [];
    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/required"]) {
      const required = /** @type string[] */ (getCompiledKeywordValue(context.ast, schemaLocation));
      if (required.length) {
        requiredSchemaLocations.push(schemaLocation);
        addAll(required, allRequired);
      }
    }

    if (allRequired.size > 0) {
      successes.push({
        message: localization.getRequiredSuccessMessage([...allRequired]),
        instanceLocation: Instance.uri(instance),
        schemaLocations: requiredSchemaLocations
      });
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/dependentRequired"]) {
      const dependencies = /** @type {[string, string[]][]} */ (getCompiledKeywordValue(context.ast, schemaLocation));
      for (const [propertyName, requiredProperties] of dependencies) {
        if (requiredProperties.length > 0) {
          successes.push({
            message: localization.getDependentRequiredSuccessMessage(propertyName, requiredProperties),
            instanceLocation: Instance.uri(instance),
            schemaLocations: [schemaLocation]
          });
        }
      }
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/draft-04/dependencies"]) {
      const dependencies = /** @type {[string, unknown][]} */ (getCompiledKeywordValue(context.ast, schemaLocation));
      for (const [propertyName, dependency] of dependencies) {
        if (Array.isArray(dependency) && dependency.length > 0) {
          successes.push({
            message: localization.getDependentRequiredSuccessMessage(propertyName, /** @type {string[]} */ (dependency)),
            instanceLocation: Instance.uri(instance),
            schemaLocations: [schemaLocation]
          });
        }
      }
    }

    return successes;
  }
};

/** @type (requiredProperties: string[], instance: JsonNode, missingSet: Set<string>) => void */
const addMissingProperties = (requiredProperties, instance, missingSet) => {
  for (const propertyName of requiredProperties) {
    if (!Instance.has(propertyName, instance)) {
      missingSet.add(propertyName);
    }
  }
};

/** @type (properties: string[], set: Set<string>) => void */
const addAll = (properties, set) => {
  for (const propertyName of properties) {
    set.add(propertyName);
  }
};

export default requiredErrorHandler;
