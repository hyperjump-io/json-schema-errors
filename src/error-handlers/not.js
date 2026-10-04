import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { allTrue, getSuccesses, isAllTrueGroup, selectKeywords, someTrue } from "../json-schema-errors.js";

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
      // knows what needs to change. At least one of these needs to be true.
      const negatedLocalization = localization.negated();
      const options = (not.outputs ?? []).flatMap((notOutput) => {
        return getSuccesses(notOutput, instance, negatedLocalization, ast);
      });

      if (options.length === 0) {
        // Nothing to describe means the 'not' schema allows any value
        errors.push({
          message: localization.getBooleanSchemaErrorMessage(),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      } else if (options.length === 1 && isAllTrueGroup(options[0])) {
        errors.push({
          message: localization.getNotErrorMessage("all"),
          alternatives: /** @type ErrorObject[][] */ (options[0].alternatives),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      } else {
        errors.push({
          message: localization.getNotErrorMessage(options.length === 1 ? "one" : "some"),
          alternatives: options.map((option) => [option]),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/not"]) {
      const not = normalizedOutput["https://json-schema.org/keyword/not"][schemaLocation];

      for (const notOutput of not.outputs ?? []) {
        if (localization.isNegated) {
          // 'not' fails if its schema passes, which requires all of its keywords to pass
          const requirements = getSuccesses(notOutput, instance, localization.negated(), ast);
          successes.push(...allTrue(requirements, instance, schemaLocation, localization));
        } else {
          // 'not' passes if its schema fails. If we know which keywords failed,
          // describe those. Otherwise, all we know is at least one of them failed.
          const failing = selectKeywords(notOutput, ({ valid }) => valid === false);
          if (Object.keys(failing).length > 0) {
            successes.push(...getSuccesses(failing, instance, localization.negated(), ast));
          } else {
            const options = getSuccesses(notOutput, instance, localization.negated(), ast);
            successes.push(...someTrue(options.map((option) => [option]), instance, schemaLocation, localization));
          }
        }
      }
    }

    return successes;
  }
};

export default notErrorHandler;
