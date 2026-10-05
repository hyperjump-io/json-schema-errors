import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  describeConditional,
  getSuccesses
} from "../json-schema-errors.js";

/**
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { ErrorHandler, ErrorHandlerContext, ErrorObject, NormalizedOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const dependentSchemasErrorHandler = {
  // Failures in dependent schemas are flattened into the parent schema's results,
  // so they're reported by the handlers for the keywords that failed

  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/dependentSchemas"]) {
      const dependencies = /** @type [string, string][] */ (normalizedOutput["https://json-schema.org/keyword/dependentSchemas"][schemaLocation].value);
      const outputs = normalizedOutput["https://json-schema.org/keyword/dependentSchemas"][schemaLocation].outputs ?? [];
      successes.push(...describeSchemaDependencies(dependencies, outputs, instance, context));
    }

    return successes;
  }
};

/**
 * A schema dependency only applies if the value is an object with the
 * dependency's property. The outputs are for the dependencies whose property is
 * present, in the order they appear in the schema.
 *
 * @type (dependencies: [string, string][], outputs: NormalizedOutput[], instance: JsonNode, context: ErrorHandlerContext) => ErrorObject[]
 */
export const describeSchemaDependencies = (dependencies, outputs, instance, context) => {
  /** @type ErrorObject[] */
  const successes = [];

  const isObject = Instance.typeOf(instance) === "object";
  let outputIndex = 0;

  for (const [propertyName, dependencyLocation] of dependencies) {
    const isPresent = isObject && Instance.has(propertyName, instance);
    const output = (isPresent ? outputs[outputIndex++] : undefined) ?? dependencyLocation;

    // The dependency only applies if the property is present
    successes.push(...describeConditional({
      condition: (context) => [{
        message: context.localization.getHasPropertySuccessMessage([propertyName]),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [dependencyLocation]
      }],
      then: (context) => getSuccesses(output, instance, context)
    }, instance, dependencyLocation, context));
  }

  return successes;
};

export default dependentSchemasErrorHandler;
