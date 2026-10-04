import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler } from "../index.d.ts"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 */

/** @type ErrorHandler */
const requiredErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type {Set<string>} */
    const allMissingRequired = new Set();
    const allSchemaLocations = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/required"]) {
      if (normalizedErrors["https://json-schema.org/keyword/required"][schemaLocation]) {
        continue;
      }

      allSchemaLocations.push(schemaLocation);
      const required = /** @type string[] */ (getCompiledKeywordValue(ast, schemaLocation));

      addMissingProperties(required, instance, allMissingRequired);
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/dependentRequired"]) {
      if (normalizedErrors["https://json-schema.org/keyword/dependentRequired"][schemaLocation]) {
        continue;
      }

      allSchemaLocations.push(schemaLocation);
      const dependencies = /** @type {[string, string[]][]} */ (getCompiledKeywordValue(ast, schemaLocation));

      for (const [propertyName, requiredProperties] of dependencies) {
        if (!Instance.has(propertyName, instance)) {
          continue;
        }
        addMissingProperties(requiredProperties, instance, allMissingRequired);
      }
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"]) {
      if (typeof normalizedErrors["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation] === "boolean") {
        continue;
      }

      const dependencies = /** @type {[string, unknown][]} */ (getCompiledKeywordValue(ast, schemaLocation));

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

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type {Set<string>} */
    const allPresentRequired = new Set();
    const allSchemaLocations = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/required"]) {
      if (normalizedOutput["https://json-schema.org/keyword/required"][schemaLocation] !== true) {
        continue;
      }

      const required = /** @type string[] */ (getCompiledKeywordValue(ast, schemaLocation));
      if (required.length) {
        allSchemaLocations.push(schemaLocation);
        addAll(required, allPresentRequired);
      }
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/dependentRequired"]) {
      if (normalizedOutput["https://json-schema.org/keyword/dependentRequired"][schemaLocation] !== true) {
        continue;
      }

      const dependencies = /** @type {[string, string[]][]} */ (getCompiledKeywordValue(ast, schemaLocation));

      let hasApplicableDependencies = false;
      for (const [propertyName, requiredProperties] of dependencies) {
        if (!Instance.has(propertyName, instance) || requiredProperties.length === 0) {
          continue;
        }

        hasApplicableDependencies = true;
        addAll(requiredProperties, allPresentRequired);
      }

      if (hasApplicableDependencies) {
        allSchemaLocations.push(schemaLocation);
      }
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/draft-04/dependencies"]) {
      if (normalizedOutput["https://json-schema.org/keyword/draft-04/dependencies"][schemaLocation] !== true) {
        continue;
      }

      const dependencies = /** @type {[string, unknown][]} */ (getCompiledKeywordValue(ast, schemaLocation));

      let hasArrayFormDependencies = false;
      for (const [propertyName, dependency] of dependencies) {
        if (!Instance.has(propertyName, instance) || !Array.isArray(dependency) || dependency.length === 0) {
          continue;
        }

        hasArrayFormDependencies = true;
        addAll(/** @type {string[]} */ (dependency), allPresentRequired);
      }

      if (hasArrayFormDependencies) {
        allSchemaLocations.push(schemaLocation);
      }
    }

    if (allPresentRequired.size === 0) {
      return [];
    }

    return [{
      message: localization.getRequiredSuccessMessage([...allPresentRequired]),
      instanceLocation: Instance.uri(instance),
      schemaLocations: allSchemaLocations
    }];
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
