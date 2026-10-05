import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  describeConditional,
  evaluateRequirements,
  getCompiledKeywordValue,
  getSuccesses
} from "../json-schema-errors.js";

/**
 * @import { AST } from "@hyperjump/json-schema/experimental"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { ErrorHandler, ErrorObject, Localization, NormalizedOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const dependentSchemasErrorHandler = {
  // Failures in dependent schemas are merged into the parent schema's results,
  // so they're reported by the handlers for the keywords that failed

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

    // The dependency only applies if the property is present
    successes.push(...describeConditional({
      condition: (localization) => [{
        message: localization.getHasPropertySuccessMessage([propertyName]),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [dependencyLocation]
      }],
      then: (localization) => getSuccesses(output, instance, localization, ast)
    }, instance, dependencyLocation, localization));
  }

  return successes;
};

export default dependentSchemasErrorHandler;
