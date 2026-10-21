import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { EvaluationPlugin, ValidationContext } from "@hyperjump/json-schema/experimental"
 * @import { NormalizedOutput } from "./index.js"
 */

/**
 * @typedef {ValidationContext & {
 *   output: NormalizedOutput;
 *   instanceUri: string;
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
  beforeSchema(_url, instance, context) {
    context.output = Object.create(null);
    // A schema's keywords all apply to the same instance location
    context.instanceUri = Instance.uri(instance);
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["beforeKeyword"]> */
  beforeKeyword(_node, _instance, context, schemaContext) {
    context.output = schemaContext.output;
  }

  // Each keyword's result includes the output of its subschemas so the
  // subschemas can be described

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["afterKeyword"]> */
  afterKeyword(keywordNode, _instance, context, valid, schemaContext) {
    const [keywordUri, schemaLocation, value] = keywordNode;

    const instanceOutput = schemaContext.output[schemaContext.instanceUri] ??= Object.create(null);
    const keywordOutput = instanceOutput[keywordUri] ??= Object.create(null);
    keywordOutput[schemaLocation] = context.subSchemaOutput
      ? { valid, value, outputs: context.subSchemaOutput }
      : { valid, value };
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["afterSchema"]> */
  afterSchema(url, _instance, context, valid) {
    if (typeof context.ast[url] === "boolean" && !valid) {
      const instanceOutput = context.output[context.instanceUri] ??= Object.create(null);
      const validationOutput = instanceOutput["https://json-schema.org/validation"] ??= Object.create(null);
      validationOutput[url] = { valid, value: false };
    }

    context.subSchemaOutput ??= [];
    context.subSchemaOutput.push(context.output);

    this.output = context.output;
  }
}
