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

  /**
   * Whether the validator treated the `format` keyword as an assertion rather
   * than an annotation. Validators often only validate `format` if they're
   * configured to. If this isn't given, messages that describe `format` say
   * that it only applies if formats are validated.
   */
  isFormatAsserted?: boolean;
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
   * Conditional applicators, like `then` and `dependentSchemas`, are simple
   * applicators whose subschemas only apply when a condition holds. Whether a
   * keyword is a simple applicator comes from its `@hyperjump/json-schema`
   * keyword definition. The results of a simple applicator's subschemas are
   * flattened into the results of its parent schema, but the results of a
   * conditional applicator are left out when describing the parent schema
   * because its error handler describes them along with the condition.
   */
  conditional?: true;

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
 * applicators, `outputs` has the normalized output of each subschema. The
 * results of a simple applicator's subschemas are only in its `outputs`. Use
 * `flattenOutput` to include them in the results of the parent schema.
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
 * `error` describes keywords that failed. `success` describes what keywords
 * require. Success messages are used to explain failures caused by a subschema
 * passing, such as with `not`. A handler can have either or both.
 */
export type ErrorHandler = {
  error?: (normalizedErrors: InstanceOutput, instance: JsonNode, localization: Localization, context: ErrorHandlerContext) => ErrorObject[];
  success?: (normalizedOutput: InstanceOutput, instance: JsonNode, localization: Localization, context: ErrorHandlerContext) => ErrorObject[];
};

/**
 * What error handlers need to know about the schema and how it was validated.
 */
export type ErrorHandlerContext = {
  ast: AST;

  /**
   * Whether the validator treated a `format` keyword as an assertion rather
   * than an annotation. It can depend on the dialect, given by the keyword
   * URI, and on the format. `undefined` if it's not known.
   */
  isFormatAsserted: (keywordUri: string, format: string) => boolean | undefined;
};

/**
 * The results of a simple applicator's subschemas are results of its parent
 * schema, but they're kept with the applicator in its `outputs`. `getErrors`
 * and `getSuccesses` flatten them for error handlers. Use this to get the
 * flattened results of a subschema's output, such as an alternative of an
 * applicator, to inspect them directly.
 */
export const flattenOutput: (normalizedOutput: NormalizedOutput) => NormalizedOutput;

/**
 * Gets the compiled value of the keyword at the given schema location, as
 * returned by the keyword's `compile` function in `@hyperjump/json-schema`.
 *
 * @param ast - The compiled schema, from the error handler's context
 * @param schemaLocation - The keyword's schema location
 */
export const getCompiledKeywordValue: (ast: AST, schemaLocation: string) => unknown;

/**
 * Converts the normalized error format to human readable errors. It's used to
 * build errors in applicator error handlers.
 */
export const getErrors: (normalizedErrors: NormalizedOutput, instance: JsonNode, localization: Localization, context: ErrorHandlerContext) => ErrorObject[];

/**
 * Converts the normalized output of a passing subschema to human readable
 * messages describing how the instance satisfied the subschema. It's used to
 * build errors in applicator error handlers that fail when a subschema passes.
 */
export const getSuccesses: (normalizedOutput: NormalizedOutput, instance: JsonNode, localization: Localization, context: ErrorHandlerContext) => ErrorObject[];

export type { Localization };

export type ContainsRange = {
  minContains?: number;
  maxContains?: number;
};

/**
 * An output format for `@hyperjump/json-schema` that returns human readable error
 * messages. Importing this package registers it.
 *
 * @example
 * const output = await validate(schemaUri, instance, { outputFormat: JSE, locale: "en-US" });
 */
export const JSE: "JSE";

export type JSEOutput = {
  valid: true;
} | {
  valid: false;
  errors: JsonSchemaErrors;
};

declare module "@hyperjump/json-schema" {
  interface OutputFormats {
    JSE: JSEOutput;
  }

  interface ValidationOptions<F extends OutputFormat = OutputFormat> {
    /**
     * A locale identifier in the form of "{language}-{region}" used for the
     * messages of the JSE output format.
     *
     * @example "en-US"
     */
    locale?: string;
  }
}
