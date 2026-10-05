import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  allTrue,
  evaluateRequirements,
  getCompiledKeywordValue,
  getErrors,
  getSuccesses,
  mergeOutputs,
  someTrue
} from "../json-schema-errors.js";

/**
 * @import { AST } from "@hyperjump/json-schema/experimental"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { ErrorHandler, ErrorObject, Localization, NormalizedOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const dependentSchemasErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/dependentSchemas"]) {
      const dependentSchemas = normalizedErrors["https://json-schema.org/keyword/dependentSchemas"][schemaLocation];
      if (dependentSchemas.valid !== false) {
        continue;
      }

      // Merged so errors from different dependencies can be combined
      const merged = mergeOutputs(dependentSchemas.outputs ?? []);
      errors.push(...getErrors(merged, instance, localization, ast));
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/dependentSchemas"]) {
      const dependencies = /** @type [string, string][] */ (getCompiledKeywordValue(ast, schemaLocation));
      const outputs = normalizedOutput["https://json-schema.org/keyword/dependentSchemas"][schemaLocation].outputs ?? [];
      successes.push(...describeSchemaDependencies(dependencies, outputs, instance, localization, ast));
    }

    return successes;
  }
};

/**
 * A schema dependency only applies if the value is an object with the
 * dependency's property. The outputs are for the dependencies whose property is
 * present, in the order they appear in the schema.
 *
 * @type (dependencies: [string, string][], outputs: NormalizedOutput[], instance: JsonNode, localization: Localization, ast: AST) => ErrorObject[]
 */
export const describeSchemaDependencies = (dependencies, outputs, instance, localization, ast) => {
  /** @type ErrorObject[] */
  const successes = [];

  const isObject = Instance.typeOf(instance) === "object";
  let outputIndex = 0;

  for (const [propertyName, dependencyLocation] of dependencies) {
    const isPresent = isObject && Instance.has(propertyName, instance);
    const output = (isPresent ? outputs[outputIndex++] : undefined)
      ?? evaluateRequirements(dependencyLocation, instance, ast);

    /** @type (localization: Localization) => ErrorObject */
    const hasProperty = (localization) => ({
      message: localization.getHasPropertySuccessMessage([propertyName]),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [dependencyLocation]
    });

    if (localization.isNegated) {
      // Fails if the value is an object with the property and the dependency fails.
      // Changing the value could remove the property, so it has to be included.
      const options = getSuccesses(output, instance, localization, ast);
      if (options.length > 0) {
        const requirements = [
          hasProperty(localization.negated()),
          ...someTrue(options.map((option) => [option]), instance, dependencyLocation, localization)
        ];
        successes.push(...allTrue(requirements, instance, dependencyLocation, localization));
      }
    } else {
      // Passes if the value doesn't have the property or the dependency passes
      const description = getSuccesses(output, instance, localization, ast);
      if (description.length > 0) {
        successes.push(...someTrue([[hasProperty(localization.negated())], description], instance, dependencyLocation, localization));
      }
    }
  }

  return successes;
};

export default dependentSchemasErrorHandler;
