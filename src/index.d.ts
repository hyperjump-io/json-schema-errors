import { AST, CompiledSchema, EvaluationPlugin } from "@hyperjump/json-schema/experimental";
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
  annotations?: OutputUnit[];
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

  /**
   * Some applicators, like `then` and `else`, only fail when their subschema
   * fails. Validators often only report the subschema's errors and not the
   * keyword itself, so this tells us to use the subschema's results when the
   * validator's output doesn't include the keyword.
   */
  validityFromSubschemas?: true;

  /**
   * Annotations, such as `title` and `description`, never affect validation. A
   * schema that only has annotations allows any value.
   */
  annotation?: true;
};

export type EvaluationContext = {
  ast: AST;
  errorIndex: ErrorIndex;
  plugins: EvaluationPlugin[];

  /**
   * Validator output doesn't usually say anything about what happens inside an
   * applicator that passed. For example, it won't say which `anyOf` alternative
   * matched. When this is true, a keyword the output doesn't mention has an
   * unknown result rather than a passing one.
   */
  isValidityUnknown?: boolean;
};

/**
 * The validation results found in the validator's output. `true` means the
 * keyword failed and `false` means the output says it passed.
 */
export type ErrorIndex = {
  [schemaLocation: string]: {
    [instanceLocation: string]: boolean;
  };
};

/**
 * The result of a keyword. `valid` is `undefined` if the result isn't known. For
 * applicators, `outputs` has the normalized output of each subschema.
 */
export type KeywordOutput = {
  valid?: boolean;
  outputs?: NormalizedOutput[];
};

/**
 * The normalized keyword result keyed by keyword URI and keyword location.
 */
export type InstanceOutput = {
  [keywordUri: string]: {
    [keywordLocation: string]: KeywordOutput;
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

/**
 * Sets an error handler for the given URI. If an error handler already exists
 * for this URI, it will be replaced with the new handler.
 *
 * @param errorHandlerUri - A URI for unique indentification of error handler
 * @param handler
 */
export const setErrorHandler: (errorHandlerUri: string, handler: ErrorHandler) => void;

/**
 * Removes the error handler registered for the given URI.
 * @param errorHandlerUri
 */
export const removeErrorHandler: (errorHandlerUri: string) => void;

/**
 * Used to transform normalized errors for one or more keywords into human readable
 * messages.
 *
 * `error` describes keywords that failed. `success` describes keywords that
 * passed. Success messages are used to explain failures caused by a subschema
 * passing, such as with `not`.
 */
export type ErrorHandler = {
  error: (normalizedErrors: InstanceOutput, instance: JsonNode, localization: Localization, ast: AST) => ErrorObject[];
  success?: (normalizedOutput: InstanceOutput, instance: JsonNode, localization: Localization, ast: AST) => ErrorObject[];
};

/**
 * Converts the normalized error format to human readable errors. It's used to
 * build errors in applicator error handlers.
 */
export const getErrors: (normalizedErrors: NormalizedOutput, instance: JsonNode, localization: Localization, ast: AST) => ErrorObject[];

/**
 * Converts the normalized output of a passing subschema to human readable
 * messages describing how the instance satisfied the subschema. It's used to
 * build errors in applicator error handlers that fail when a subschema passes.
 */
export const getSuccesses: (normalizedOutput: NormalizedOutput, instance: JsonNode, localization: Localization, ast: AST) => ErrorObject[];

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

export const evaluateCompiledSchema: (compiledSchema: CompiledSchema, instance: Json, options?: ValidationOptions) => ValidationResult;

export type EvaluateInstance = (instance: Json, options?: ValidationOptions) => ValidationResult;

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
