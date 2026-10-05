import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  describeConditional,
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
  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    // A value that doesn't exist can't have properties that don't exist. This
    // also prevents infinitely describing recursive schemas.
    if (isPlaceholder(instance)) {
      return successes;
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/properties"]) {
      const properties = /** @type Record<string, string> */ (normalizedOutput["https://json-schema.org/keyword/properties"][schemaLocation].value);
      const isObject = Instance.typeOf(instance) === "object";

      for (const propertyName in properties) {
        if (isObject && Instance.has(propertyName, instance)) {
          continue;
        }

        // The property's subschema only applies if the property is present
        const property = getPlaceholder(instance, propertyName);
        successes.push(...describeConditional({
          condition: (context) => [{
            message: context.localization.getHasPropertySuccessMessage([propertyName]),
            instanceLocation: Instance.uri(instance),
            schemaLocations: [schemaLocation]
          }],
          then: (context) => getSuccesses(properties[propertyName], property, context)
        }, instance, schemaLocation, context));
      }
    }

    return successes;
  }
};

export default propertiesErrorHandler;
