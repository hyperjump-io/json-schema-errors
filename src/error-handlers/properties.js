import * as Instance from "@hyperjump/json-schema/instance/experimental";
import {
  allTrue,
  evaluateRequirements,
  getCompiledKeywordValue,
  getPlaceholder,
  getSuccesses,
  isPlaceholder,
  someTrue
} from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, Localization } from "../index.d.ts"
 */

/**
 * Errors and descriptions of the properties that are present come from the
 * property subschemas. This describes the properties that aren't present.
 *
 * @type ErrorHandler
 */
const propertiesErrorHandler = {
  error: () => [],

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    // A value that doesn't exist can't have properties that don't exist. This
    // also prevents infinitely describing recursive schemas.
    if (isPlaceholder(instance)) {
      return successes;
    }

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/properties"]) {
      const properties = /** @type Record<string, string> */ (getCompiledKeywordValue(ast, schemaLocation));
      const isObject = Instance.typeOf(instance) === "object";

      /** @type (localization: Localization, propertyName: string) => ErrorObject */
      const hasProperty = (localization, propertyName) => ({
        message: localization.getHasPropertySuccessMessage([propertyName]),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });

      for (const propertyName in properties) {
        if (isObject && Instance.has(propertyName, instance)) {
          continue;
        }

        const property = getPlaceholder(instance, propertyName);
        const output = evaluateRequirements(properties[propertyName], property, ast);
        const propertyDescription = getSuccesses(output, instance, localization, ast);
        if (propertyDescription.length === 0) {
          continue;
        }

        if (localization.isNegated) {
          // Fails if the value is an object with the property and the property's value fails
          const requirements = [
            hasProperty(localization.negated(), propertyName),
            ...someTrue(propertyDescription.map((option) => [option]), instance, schemaLocation, localization)
          ];
          successes.push(...allTrue(requirements, instance, schemaLocation, localization));
        } else {
          // Passes if the property isn't there or the property's value passes
          const options = [[hasProperty(localization.negated(), propertyName)], propertyDescription];
          successes.push(...someTrue(options, instance, schemaLocation, localization));
        }
      }
    }

    return successes;
  }
};

export default propertiesErrorHandler;
