import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { allTrue, getSuccesses, isAllTrueGroup, negate, showSmallestFirst, someTrue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const notErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/not"]) {
      const not = normalizedErrors["https://json-schema.org/keyword/not"][schemaLocation];
      if (not.valid !== false) {
        continue;
      }

      // The 'not' schema passed. Describe what would make it fail so the user
      // knows what needs to change. At least one of these needs to be true.
      const negatedContext = negate(context);
      const options = (not.outputs ?? []).flatMap((notOutput) => {
        return getSuccesses(notOutput, instance, negatedContext);
      });

      if (options.length === 0) {
        // Nothing to describe means the 'not' schema allows any value
        errors.push({
          message: context.localization.getBooleanSchemaErrorMessage(),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      } else if (options.length === 1 && isAllTrueGroup(options[0])) {
        errors.push({
          message: context.localization.getNotErrorMessage("all"),
          alternatives: /** @type ErrorObject[][] */ (options[0].alternatives),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      } else {
        errors.push(showSmallestFirst({
          message: context.localization.getNotErrorMessage(options.length === 1 ? "one" : "some"),
          alternatives: options.map((option) => [option]),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        }));
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/not"]) {
      const not = normalizedOutput["https://json-schema.org/keyword/not"][schemaLocation];

      for (const notOutput of not.outputs ?? []) {
        if (context.localization.isNegated) {
          // 'not' fails if its schema passes, which requires all of its keywords to pass
          const requirements = getSuccesses(notOutput, instance, negate(context));
          successes.push(...allTrue(requirements, instance, schemaLocation, context));
        } else {
          // 'not' passes if at least one of its schema's keywords fails. All of them
          // are described, even if we know which ones fail, because these
          // descriptions tell the user what would need to change to make 'not' fail.
          const options = getSuccesses(notOutput, instance, negate(context));
          successes.push(...someTrue(options.map((option) => [option]), instance, schemaLocation, context));
        }
      }
    }

    return successes;
  }
};

export default notErrorHandler;
