import { AST, EvaluationPlugin } from "@hyperjump/json-schema/experimental";
import { JsonNode } from "@hyperjump/json-schema/instance/experimental";
import { Localization } from "./localization.js";

/**
 * Converts standard JSON Schema validation output into human-oriented, localized
 * messages. Schemas need to be registered with `@hyperjump/json-schema`'s
 * `registerSchema` function. The default locale is `en-US`.
 *
 * @param errorOutput - The validation output in standard JSON Schema output format.
 * @param schemaUri - The URI of the JSON Schema the data was validated against
 * @param instance - The JSON data that was validated
 * @param options - Options to configure the error handler (default locale is "en-US")
 */
export const jsonSchemaErrors: (
  errorOutput: OutputFormat,
  schemaUri: string,
  instance: Json,
  options?: JsonSchemaErrorsOptions
) => Promise<JsonSchemaErrors>;

/**
 * Sets a normalization handler for a specific keyword URI. Normalization handlers
 * process keyword values during schema validation to produce normalized output.
 */
export const setNormalizationHandler: (keywordUri: string, handler: NormalizationHandler) => void;

/**
 * The standard JSON Schema output format. Supports the "basic", "detailed", and
 * "verbose" formats.
 */
export type OutputFormat = OutputUnit & {
  valid: boolean;
};

/**
 * A single node of the JSON Schema output format.
 */
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

export type JsonSchemaErrorsOptions = {
  /**
   * A locale identifier in the form of "{language}-{region}".
   *
   * @example "en-US"
   */
  locale?: string;
};

/**
 * An array of error objects representing validation failures.
 */
export type JsonSchemaErrors = ErrorObject[];

/**
 * Represents a single validation error with message and schema location
 * information.
 */
export type ErrorObject = {
  message: string;
  alternatives?: ErrorObject[][];
  instanceLocation: string;
  schemaLocations: string[];
};

/**
 * Used to convert a specific keyword to the normalized format used by the error
 * handlers.
 */
export type NormalizationHandler<KeywordValue = unknown, Context extends EvaluationContext = EvaluationContext> = {
  /**
   * For non-applicator keywords, this doesn't need to do anything. Just return void.
   *
   * For applicator keywords, it should call `evaluateSchema` on each subschema and
   * return an array with each result.
   */
  evaluate(value: KeywordValue, instance: JsonNode, context: Context): NormalizedOutput[] | void;

  /**
   * Simple applicators just apply subschemas and don't have any validation behavior
   * of their own. For example, `allOf` and `properties` are simple applicators. They
   * never fail. Only their subschema can fail. `anyOf` and `oneOf` are not simple
   * applicators because they can fail independently of the validation result of
   * their subschemas.
   */
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

/**
 * The normalized keyword result keyed by keyword URI and keyword location. If the
 * keyword is an applicator the values can be `false` or `NormalizedOutput[]`. If
 * the value is not an applicator, the value is just a boolean.
 */
export type InstanceOutput = {
  [keywordUri: string]: {
    [keywordLocation: string]: boolean | NormalizedOutput[];
  };
};

/**
 * A map of an instance location to the normalized keyword result for that location.
 */
export type NormalizedOutput = {
  [instanceLocation: string]: InstanceOutput;
};

/**
 * Builds the normalized output format for a schema. It's used in normalization
 * handlers to evaluate an applicator's subschemas.
 *
 * @param schemaLocation - A URI with a JSON Pointer fragment
 * @param instance
 * @param context
 */
export const evaluateSchema: (schemaLocation: string, instance: JsonNode, context: EvaluationContext) => NormalizedOutput;

export const addErrorHandler: (handler: ErrorHandler) => void;

/**
 * A function that transforms normalized errors for one or more keywords into human
 * readable messages.
 */
export type ErrorHandler = (normalizedErrors: InstanceOutput, instance: JsonNode, localization: Localization) => Promise<ErrorObject[]>;

/**
 * Converts the normalized error format to human readable errors. It's used to
 * build errors in applicator error handlers.
 */
export const getErrors: (normalizedErrors: NormalizedOutput, instance: JsonNode, localization: Localization) => Promise<ErrorObject[]>;

export type { Localization };

export type ContainsRange = {
  minContains?: number;
  maxContains?: number;
};

/**
 * Validate an instance against a schema and get error messages in one step instead
 * of getting output from validation and passing it to jsonSchemaErrors. The
 * function is curried so you can compile the schema one time and evaluate multiple
 * instances against the same compiled schema.
 *
 * Ideally, this function should be in @hyperjump/json-schema instead and this will
 * be removed in the future.
 *
 * @deprecated
 */
export const validate: (
  (schemaUri: string) => Promise<EvaluateInstance>
) & (
  (schemaUri: string, instance: Json, options?: ValidationOptions) => Promise<ValidationResult>
);

export type EvaluateInstance = (instance: Json, options?: ValidationOptions) => Promise<ValidationResult>;

export type ValidationOptions = {
  /**
   * A locale identifier in the form of "{language}-{region}".
   *
   * @example "en-US"
   */
  locale?: string;
  plugins?: EvaluationPlugin[];
};

export type ValidationResult = {
  valid: true;
} | {
  valid: false;
  errors: JsonSchemaErrors;
};
