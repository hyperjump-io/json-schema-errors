import {
  describeConditional,
  evaluateRequirements,
  getCompiledKeywordValue,
  getSuccesses,
  someTrue
} from "../json-schema-errors.js";

/**
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { AST } from "@hyperjump/json-schema/experimental"
 * @import { ErrorHandler, ErrorHandlerContext, ErrorObject, InstanceOutput, NormalizedOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const ifThenElseErrorHandler = {
  // Failures in 'then' and 'else' are flattened into the parent schema's results,
  // so they're reported by the handlers for the keywords that failed

  success: (normalizedOutput, instance, context) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const ifLocation in normalizedOutput["https://json-schema.org/keyword/if"]) {
      const ifOutput = normalizedOutput["https://json-schema.org/keyword/if"][ifLocation].outputs?.[0];
      const thenOutput = getSiblingOutput(normalizedOutput, "https://json-schema.org/keyword/then", ifLocation, instance, context.ast);
      const elseOutput = getSiblingOutput(normalizedOutput, "https://json-schema.org/keyword/else", ifLocation, instance, context.ast);
      if (!ifOutput || (!thenOutput && !elseOutput)) {
        continue;
      }

      /** @type (output: NormalizedOutput) => (context: ErrorHandlerContext) => ErrorObject[] */
      const describe = (output) => (context) => getSuccesses(output, instance, context);

      // Both branches are described, even if we know which way 'if' went,
      // because changing the value could change whether 'if' passes
      successes.push(...describeConditional({
        condition: (context) => {
          const description = describe(ifOutput)(context);
          // 'if' fails if any of its keywords fail
          return context.localization.isNegated
            ? someTrue(description.map((option) => [option]), instance, ifLocation, context)
            : description;
        },
        then: thenOutput ? describe(thenOutput) : undefined,
        else: elseOutput ? describe(elseOutput) : undefined
      }, instance, ifLocation, context));
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
