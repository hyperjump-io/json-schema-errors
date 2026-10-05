import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  describeConditional,
  evaluateRequirements,
  getCompiledKeywordValue,
  getPlaceholder,
  getSuccesses,
  isPlaceholder
} from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/**
 * Errors and descriptions of the properties that are present come from the
 * property subschemas. This describes the properties that aren't present.
 *
 * @type ErrorHandler
 */
const propertiesErrorHandler = {
  success: (normalizedOutput, instance, localization, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    // A value that doesn't exist can't have properties that don't exist. This
    // also prevents infinitely describing recursive schemas.
    if (isPlaceholder(instance)) {
      return successes;
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/properties"]) {
      const properties = /** @type Record<string, string> */ (getCompiledKeywordValue(context.ast, schemaLocation));
      const isObject = Instance.typeOf(instance) === "object";

      for (const propertyName in properties) {
        if (isObject && Instance.has(propertyName, instance)) {
          continue;
        }

        // The property's subschema only applies if the property is present
        const property = getPlaceholder(instance, propertyName);
        const output = evaluateRequirements(properties[propertyName], property, context.ast);
        successes.push(...describeConditional({
          condition: (localization) => [{
            message: localization.getHasPropertySuccessMessage([propertyName]),
            instanceLocation: Instance.uri(instance),
            schemaLocations: [schemaLocation]
          }],
          then: (localization) => getSuccesses(output, instance, localization, context)
        }, instance, schemaLocation, localization));
      }
    }

    return successes;
  }
};

export default propertiesErrorHandler;
