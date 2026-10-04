import { allTrue, getErrors, getSuccesses, isFailing, isPassing, selectKeywords, someTrue } from "../json-schema-errors.js";

/**
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { AST } from "@hyperjump/json-schema/experimental"
 * @import { ErrorHandler, ErrorObject, InstanceOutput, Localization, NormalizedOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const ifThenElseErrorHandler = {
  error: (normalizedErrors, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const keywordUri of ["https://json-schema.org/keyword/then", "https://json-schema.org/keyword/else"]) {
      for (const schemaLocation in normalizedErrors[keywordUri]) {
        const keywordOutput = normalizedErrors[keywordUri][schemaLocation];
        if (keywordOutput.valid !== false) {
          continue;
        }

        for (const subschemaOutput of keywordOutput.outputs ?? []) {
          errors.push(...getErrors(subschemaOutput, instance, localization, ast));
        }
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const ifLocation in normalizedOutput["https://json-schema.org/keyword/if"]) {
      const ifOutput = normalizedOutput["https://json-schema.org/keyword/if"][ifLocation].outputs?.[0];
      const thenOutput = getSiblingOutput(normalizedOutput, "https://json-schema.org/keyword/then", ifLocation);
      const elseOutput = getSiblingOutput(normalizedOutput, "https://json-schema.org/keyword/else", ifLocation);
      if (!ifOutput || (!thenOutput && !elseOutput)) {
        continue;
      }

      /** @type (output: NormalizedOutput, localization: Localization) => ErrorObject[] */
      const describe = (output, localization) => getSuccesses(output, instance, localization, ast);
      /** @type (output: NormalizedOutput, localization: Localization) => ErrorObject[] */
      const describeOptions = (output, localization) => {
        const options = describe(output, localization);
        return someTrue(options.map((option) => [option]), instance, ifLocation, localization);
      };

      const ifPassed = isPassing(ifOutput);
      const ifFailed = isFailing(ifOutput);

      if (localization.isNegated) {
        // Fails if 'if' passes and 'then' fails or if 'if' fails and 'else' fails.
        // Changing the value could change whether 'if' passes, so both need to be
        // described even if we know which way 'if' went.
        if (thenOutput) {
          const thenOptions = describeOptions(thenOutput, localization);
          if (thenOptions.length > 0) {
            const requirements = [...describe(ifOutput, localization.negated()), ...thenOptions];
            successes.push(...allTrue(requirements, instance, ifLocation, localization));
          }
        }

        if (elseOutput) {
          const elseOptions = describeOptions(elseOutput, localization);
          if (elseOptions.length > 0) {
            const requirements = [...describeOptions(ifOutput, localization), ...elseOptions];
            successes.push(...allTrue(requirements, instance, ifLocation, localization));
          }
        }
      } else {
        // Passes if 'if' passes and 'then' passes or if 'if' fails and 'else' passes
        const negated = localization.negated();

        if (ifPassed) {
          successes.push(...describe(ifOutput, localization));
          if (thenOutput) {
            successes.push(...describe(thenOutput, localization));
          }
        } else if (ifFailed) {
          const failing = selectKeywords(ifOutput, ({ valid }) => valid === false);
          successes.push(...describe(failing, negated));
          if (elseOutput) {
            successes.push(...describe(elseOutput, localization));
          }
        } else {
          const thenOption = [...describe(ifOutput, localization), ...thenOutput ? describe(thenOutput, localization) : []];
          const elseOption = [...describeOptions(ifOutput, negated), ...elseOutput ? describe(elseOutput, localization) : []];
          successes.push(...someTrue([thenOption, elseOption], instance, ifLocation, localization));
        }
      }
    }

    return successes;
  }
};

/** @type (normalizedOutput: InstanceOutput, keywordUri: string, ifLocation: string) => NormalizedOutput | undefined */
const getSiblingOutput = (normalizedOutput, keywordUri, ifLocation) => {
  const parentLocation = ifLocation.replace(/\/[^/]+$/, "");
  for (const schemaLocation in normalizedOutput[keywordUri]) {
    if (schemaLocation.replace(/\/[^/]+$/, "") === parentLocation) {
      return normalizedOutput[keywordUri][schemaLocation].outputs?.[0];
    }
  }
};

export default ifThenElseErrorHandler;
