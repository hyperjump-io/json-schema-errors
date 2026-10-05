import { allTrue, evaluateRequirements, getCompiledKeywordValue, getErrors, getSuccesses, someTrue } from "../json-schema-errors.js";

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
      const thenOutput = getSiblingOutput(normalizedOutput, "https://json-schema.org/keyword/then", ifLocation, instance, ast);
      const elseOutput = getSiblingOutput(normalizedOutput, "https://json-schema.org/keyword/else", ifLocation, instance, ast);
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
        // Passes if 'if' passes and 'then' passes or if 'if' fails and 'else'
        // passes. Both are described, even if we know which way 'if' went,
        // because these descriptions tell the user what would need to change to
        // make it fail.
        const negated = localization.negated();
        const thenOption = [...describe(ifOutput, localization), ...thenOutput ? describe(thenOutput, localization) : []];
        const elseOption = [...describeOptions(ifOutput, negated), ...elseOutput ? describe(elseOutput, localization) : []];
        successes.push(...someTrue([thenOption, elseOption], instance, ifLocation, localization));
      }
    }

    return successes;
  }
};

/**
 * Validators usually only evaluate the branch that applies. The other one can
 * still be described from the schema because descriptions don't depend on
 * results.
 *
 * @type (normalizedOutput: InstanceOutput, keywordUri: string, ifLocation: string, instance: JsonNode, ast: AST) => NormalizedOutput | undefined
 */
const getSiblingOutput = (normalizedOutput, keywordUri, ifLocation, instance, ast) => {
  const parentLocation = ifLocation.replace(/\/[^/]+$/, "");
  for (const schemaLocation in normalizedOutput[keywordUri]) {
    if (schemaLocation.replace(/\/[^/]+$/, "") === parentLocation) {
      const [, subschemaLocation] = /** @type [string, string] */ (getCompiledKeywordValue(ast, schemaLocation));
      return normalizedOutput[keywordUri][schemaLocation].outputs?.[0]
        ?? evaluateRequirements(subschemaLocation, instance, ast);
    }
  }
};

export default ifThenElseErrorHandler;
