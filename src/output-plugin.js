import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { EvaluationPlugin, ValidationContext } from "@hyperjump/json-schema/experimental"
 * @import { NormalizedOutput } from "./index.js"
 */

/**
 * @typedef {ValidationContext & {
 *   output: NormalizedOutput;
 *   subSchemaOutput?: NormalizedOutput[];
 * }} ErrorsContext
 */

/** @implements EvaluationPlugin<ErrorsContext> */
export class JsonSchemaErrorsOutputPlugin {
  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["beforeSchema"]> */
  beforeSchema(_url, _instance, context) {
    context.output = {};
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["beforeKeyword"]> */
  beforeKeyword(_node, _instance, context, schemaContext) {
    context.output = schemaContext.output;
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["afterKeyword"]> */
  afterKeyword(keywordNode, instance, context, valid, schemaContext, keyword) {
    const [keywordUri, schemaLocation] = keywordNode;

    if (keyword.simpleApplicator) {
      for (const subSchemaOutput of context.subSchemaOutput ?? []) {
        mergeOutput(schemaContext.output, subSchemaOutput);
      }
    } else {
      schemaContext.output[Instance.uri(instance)] ??= {};
      schemaContext.output[Instance.uri(instance)][keywordUri] ??= {};
      schemaContext.output[Instance.uri(instance)][keywordUri][schemaLocation] = valid
        || (context.subSchemaOutput ?? valid);
    }
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["afterSchema"]> */
  afterSchema(url, instance, context, valid) {
    if (typeof context.ast[url] === "boolean" && !valid) {
      context.output[Instance.uri(instance)] ??= {};
      context.output[Instance.uri(instance)]["https://json-schema.org/validation"] ??= {};
      context.output[Instance.uri(instance)]["https://json-schema.org/validation"][url] = valid;
    }

    context.subSchemaOutput ??= [];
    context.subSchemaOutput.push(context.output);

    this.output = context.output;
  }
}

/** @type (a: NormalizedOutput, b: NormalizedOutput) => void */
const mergeOutput = (a, b) => {
  for (const instanceLocation in b) {
    a[instanceLocation] ??= {};
    for (const keywordUri in b[instanceLocation]) {
      a[instanceLocation][keywordUri] ??= {};

      Object.assign(a[instanceLocation][keywordUri], b[instanceLocation][keywordUri]);
    }
  }
};
