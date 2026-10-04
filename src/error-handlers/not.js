import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getSuccesses } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const notErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/not"]) {
      const not = normalizedErrors["https://json-schema.org/keyword/not"][schemaLocation];
      if (not.valid !== false) {
        continue;
      }

      // The 'not' schema passed. Describe what would make it fail so the user
      // knows what needs to change.
      const negatedLocalization = localization.negated();
      const successes = (not.outputs ?? []).flatMap((notOutput) => {
        return getSuccesses(notOutput, instance, negatedLocalization, ast);
      });

      if (successes.length) {
        errors.push({
          message: localization.getNotErrorMessage(successes.length),
          alternatives: [successes],
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      } else {
        // Nothing to describe means the 'not' schema allows any value
        errors.push({
          message: localization.getBooleanSchemaErrorMessage(),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }
    }

    return errors;
  }
};

export default notErrorHandler;
