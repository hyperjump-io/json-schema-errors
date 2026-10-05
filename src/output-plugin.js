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
  constructor() {
    /** @type NormalizedOutput */
    this.output = {};
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["beforeSchema"]> */
  beforeSchema(_url, _instance, context) {
    context.output = {};
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["beforeKeyword"]> */
  beforeKeyword(_node, _instance, context, schemaContext) {
    context.output = schemaContext.output;
  }

  // Each keyword's result includes the output of its subschemas so the
  // subschemas can be described

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["afterKeyword"]> */
  afterKeyword(keywordNode, instance, context, valid, schemaContext) {
    const [keywordUri, schemaLocation, value] = keywordNode;

    schemaContext.output[Instance.uri(instance)] ??= {};
    schemaContext.output[Instance.uri(instance)][keywordUri] ??= {};
    schemaContext.output[Instance.uri(instance)][keywordUri][schemaLocation] = context.subSchemaOutput
      ? { valid, value, outputs: context.subSchemaOutput }
      : { valid, value };
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["afterSchema"]> */
  afterSchema(url, instance, context, valid) {
    if (typeof context.ast[url] === "boolean" && !valid) {
      context.output[Instance.uri(instance)] ??= {};
      context.output[Instance.uri(instance)]["https://json-schema.org/validation"] ??= {};
      context.output[Instance.uri(instance)]["https://json-schema.org/validation"][url] = { valid, value: false };
    }

    context.subSchemaOutput ??= [];
    context.subSchemaOutput.push(context.output);

    this.output = context.output;
  }
}
