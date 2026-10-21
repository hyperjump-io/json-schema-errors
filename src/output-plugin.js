import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { EvaluationPlugin, Node, ValidationContext } from "@hyperjump/json-schema/experimental"
 * @import { JsonNode } from "@hyperjump/json-schema/instance/experimental"
 * @import { NormalizedOutput } from "./index.js"
 */

/**
 * What evaluating a schema did. Each keyword's result includes the results of
 * its subschemas so the subschemas can be described.
 *
 * @typedef {{
 *   url: string;
 *   instance: JsonNode;
 *   valid: boolean;
 *   isBoolean: boolean;
 *   keywords: KeywordResult[];
 * }} SchemaResult
 *
 * @typedef {{
 *   node: Node<unknown>;
 *   valid: boolean;
 *   subschemas: SchemaResult[] | undefined;
 * }} KeywordResult
 */

/**
 * @typedef {ValidationContext & {
 *   schemaResult: SchemaResult;
 *   subschemaResults?: SchemaResult[];
 * }} ErrorsContext
 */

/**
 * The output is only needed when there are errors, so evaluation records what
 * happened and the normalized output is built from it when it's asked for.
 *
 * @implements EvaluationPlugin<ErrorsContext>
 */
export class JsonSchemaErrorsOutputPlugin {
  /** @type SchemaResult | undefined */
  #result;
  /** @type NormalizedOutput | undefined */
  #output;

  /** @type NormalizedOutput */
  get output() {
    this.#output ??= this.#result ? toNormalizedOutput(this.#result) : {};
    return this.#output;
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["beforeSchema"]> */
  beforeSchema(url, instance, context) {
    context.schemaResult = { url, instance, valid: true, isBoolean: typeof context.ast[url] === "boolean", keywords: [] };
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["afterKeyword"]> */
  afterKeyword(node, _instance, context, valid, schemaContext) {
    schemaContext.schemaResult.keywords.push({ node, valid, subschemas: context.subschemaResults });
  }

  /** @type NonNullable<EvaluationPlugin<ErrorsContext>["afterSchema"]> */
  afterSchema(_url, _instance, context, valid) {
    context.schemaResult.valid = valid;

    context.subschemaResults ??= [];
    context.subschemaResults.push(context.schemaResult);

    this.#result = context.schemaResult;
    this.#output = undefined;
  }
}

/** @type (schemaResult: SchemaResult) => NormalizedOutput */
const toNormalizedOutput = ({ url, instance, valid, isBoolean, keywords }) => {
  /** @type NormalizedOutput */
  const output = Object.create(null);

  if (isBoolean) {
    if (!valid) {
      output[Instance.uri(instance)] = {
        "https://json-schema.org/validation": { [url]: { valid, value: false } }
      };
    }
  } else if (keywords.length > 0) {
    const instanceOutput = output[Instance.uri(instance)] = Object.create(null);
    for (const { node: [keywordUri, schemaLocation, value], valid, subschemas } of keywords) {
      instanceOutput[keywordUri] ??= Object.create(null);
      instanceOutput[keywordUri][schemaLocation] = subschemas
        ? { valid, value, outputs: subschemas.map(toNormalizedOutput) }
        : { valid, value };
    }
  }

  return output;
};
