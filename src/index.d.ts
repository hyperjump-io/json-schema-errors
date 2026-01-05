import { AST, EvaluationPlugin } from "@hyperjump/json-schema/experimental";
import { JsonNode } from "@hyperjump/json-schema/instance/experimental";
import { Localization } from "./localization.js";

export const jsonSchemaErrors: (
  errorOutput: OutputFormat,
  schemaUri: string,
  instance: Json,
  options?: Options
) => Promise<JsonSchemaErrors>;

export const setNormalizationHandler: (uri: string, handler: NormalizationHandler) => void;

export type OutputFormat = OutputUnit & {
  valid: boolean;
};

export type OutputUnit = {
  valid?: boolean;
  absoluteKeywordLocation?: string;
  keywordLocation?: string;
  instanceLocation?: string;
  errors?: OutputUnit[];
};

export type Json = string | number | boolean | null | JsonObject | Json[];
export type JsonObject = {
  [property: string]: Json;
};

export type Options = {
  language?: string;
};

export type JsonSchemaErrors = ErrorObject[];

export type ErrorObject = {
  message: string;
  alternatives?: ErrorObject[][];
  instanceLocation: string;
  schemaLocations: string[];
};

export type NormalizationHandler<KeywordValue = unknown, Context extends EvaluationContext = EvaluationContext> = {
  evaluate(value: KeywordValue, instance: JsonNode, context: Context): NormalizedOutput[] | void;
  simpleApplicator?: true;
};

export type EvaluationContext = {
  ast: AST;
  errorIndex: ErrorIndex;
  plugins: EvaluationPlugin[];
};

export type ErrorIndex = {
  [schemaLocation: string]: {
    [instanceLocation: string]: boolean;
  };
};

export type InstanceOutput = {
  [keywordUri: string]: {
    [keywordLocation: string]: boolean | NormalizedOutput[];
  };
};

export type NormalizedOutput = {
  [instanceLocation: string]: InstanceOutput;
};

export const addErrorHandler: (handler: ErrorHandler) => void;

export type ErrorHandler = (normalizedErrors: InstanceOutput, instance: JsonNode, localization: Localization) => Promise<ErrorObject[]>;

export const evaluateSchema: (schemaLocation: string, instance: JsonNode, context: EvaluationContext) => NormalizedOutput;
