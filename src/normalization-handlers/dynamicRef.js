import { evaluateSchema } from "../json-schema-errors.js";

/**
 * @import { EvaluationContext, NormalizationHandler } from "../index.d.ts"
 */

/**
 * @typedef {{
 *   dynamicAnchors: Record<string, string>
 * } & EvaluationContext} DynamicContext
 */

/** @type NormalizationHandler<string, DynamicContext> */
const dynamicRefNormalizationHandler = {
  evaluate([id, fragment, ref], instance, context) {
    if (fragment in context.ast.metaData[id].dynamicAnchors) {
      context.dynamicAnchors = { ...context.ast.metaData[id].dynamicAnchors, ...context.dynamicAnchors };
      return [evaluateSchema(context.dynamicAnchors[fragment], instance, context)];
    } else {
      return [evaluateSchema(ref, instance, context)];
    }
  }
};

export default dynamicRefNormalizationHandler;
