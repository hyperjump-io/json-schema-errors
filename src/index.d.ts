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
 * The result of a keyword. `valid` is `undefined` if the result isn't known.
 * `value` is the keyword's value as compiled by its `@hyperjump/json-schema`
 * keyword definition. For applicators, `outputs` has the normalized output of
 * each subschema.
 */
export type KeywordOutput = {
  valid?: boolean;
  value: unknown;
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
  error?: (normalizedErrors: InstanceOutput, instance: JsonNode, context: ErrorHandlerContext) => ErrorObject[];
  success?: (normalizedOutput: InstanceOutput, instance: JsonNode, context: ErrorHandlerContext) => ErrorObject[];
};

/**
 * What error handlers need to know about the schema, how it was validated, and
 * how to write messages.
 */
export type ErrorHandlerContext = {
  ast: AST;

  /**
   * Builds messages in the requested locale. In a negated context, success
   * messages describe what would make keywords fail instead of what they
   * require.
   */
  localization: Localization;

  /**
   * Whether the validator treated a `format` keyword as an assertion rather
   * than an annotation. It can depend on the dialect, given by the keyword
   * URI, and on the format. `undefined` if it's not known.
   */
  isFormatAsserted: (keywordUri: string, format: string) => boolean | undefined;
};

/**
 * Whether a subschema passed, based on the results of its keywords. It's
 * `false` if any keyword failed, `true` if every keyword passed, and
 * `undefined` if it isn't known. Validators don't usually report what happened
 * inside an applicator that passed, so results there are often unknown.
 */
export const getValidity: (normalizedOutput: NormalizedOutput) => boolean | undefined;

/**
 * Converts the normalized error format to human readable errors. It's used to
 * build errors in applicator error handlers.
 */
export const getErrors: (normalizedErrors: NormalizedOutput, instance: JsonNode, context: ErrorHandlerContext) => ErrorObject[];

/**
 * Describes what a subschema requires, or in a negated context, what would make
 * it fail. It's used to build errors in applicator error handlers that fail
 * when a subschema passes, such as `not`. Descriptions don't depend on results,
 * so a subschema the validator didn't evaluate can be described by its schema
 * location instead of its normalized output, such as the subschema of a
 * property that isn't present.
 *
 * @param subschema - The subschema's normalized output or its schema location
 * @param instance - The value the subschema applies to. Use `getPlaceholder`
 *   for a value that isn't present.
 * @param context
 */
export const getSuccesses: (subschema: NormalizedOutput | string, instance: JsonNode, context: ErrorHandlerContext) => ErrorObject[];

/**
 * A view of the context where success messages describe what would make
 * keywords fail instead of what they require. It's used to explain failures of
 * keywords like `not` that fail when a subschema passes. Negating a negated
 * context gives back the original meaning.
 */
export const negate: (context: ErrorHandlerContext) => ErrorHandlerContext;

/**
 * A placeholder stands in for a value that isn't present, such as a property
 * that isn't present or an item that could be added, so what that value would
 * need to be can be described.
 *
 * @param parent - The value that would contain it
 * @param segment - The property name or item index
 */
export const getPlaceholder: (parent: JsonNode, segment: string) => JsonNode;

/**
 * Whether a value is a placeholder for a value that isn't present. Handlers
 * that describe values that aren't present, such as properties, shouldn't
 * describe them for a value that isn't present either.
 */
export const isPlaceholder: (instance: JsonNode) => boolean;

/**
 * Describes subschemas that only apply under some condition, such as a
 * property's subschema only applying if the property is present. Each function
 * describes its part using the given context, so `condition` describes the
 * condition holding, or with a negated context, not holding.
 */
export const describeConditional: (conditional: Conditional, instance: JsonNode, schemaLocation: string, context: ErrorHandlerContext) => ErrorObject[];

export type Conditional = {
  condition: (context: ErrorHandlerContext) => ErrorObject[];
  then?: (context: ErrorHandlerContext) => ErrorObject[];
  else?: (context: ErrorHandlerContext) => ErrorObject[];
};

/**
 * Describes a subschema that applies to every location in some scope, such as
 * every item in an array, including locations that could be added.
 */
export const describeScope: (scope: Scope, instance: JsonNode, schemaLocation: string, context: ErrorHandlerContext) => ErrorObject[];

export type Scope = {
  /** The subschema that applies to every location in the scope */
  subschemaLocation: string;

  /** A placeholder that stands in for any location in the scope */
  placeholder: JsonNode;

  /** The message for what each location requires, given how many things that is */
  each: (localization: Localization, count: number) => string;

  /** The message for the scope being empty, which is what a `false` subschema requires */
  none: (localization: Localization) => string;
};

/**
 * Success messages are a list of things that are all true. When something is
 * a choice of options instead, this groups them with a message that says how
 * many of the options are true. Each option is a list of things that are all
 * true.
 */
export const countTrue: (options: ErrorObject[][], range: { min?: number; max?: number }, instance: JsonNode, schemaLocation: string, context: ErrorHandlerContext) => ErrorObject[];

/**
 * Groups options where at least one of them is true. The same as `countTrue`
 * with a `min` of 1.
 */
export const someTrue: (options: ErrorObject[][], instance: JsonNode, schemaLocation: string, context: ErrorHandlerContext) => ErrorObject[];

/**
 * Negated success messages are a list of things where at least one is true.
 * When several things need to be true instead, this groups them.
 */
export const allTrue: (items: ErrorObject[], instance: JsonNode, schemaLocation: string, context: ErrorHandlerContext) => ErrorObject[];

export type { Localization };

/**
 * Adds Fluent messages for a locale, such as messages for a custom keyword or
 * a translation for a locale that isn't included. A message with the same id
 * as an existing message replaces it. Messages that aren't translated for a
 * locale fall back to en-US.
 *
 * Messages for keywords use the ids `{keyword}-message` for errors and
 * `{keyword}-success-message` and `{keyword}-negated-message` for describing
 * what a keyword requires.
 *
 * @param locale - A locale identifier in the form of "{language}-{region}"
 * @param ftl - Messages in the Fluent syntax
 * @param options.direction - The text direction of a new locale. It's ignored if the locale already exists.
 */
export const addTranslation: (locale: string, ftl: string, options?: { direction?: "ltr" | "rtl" }) => void;

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
