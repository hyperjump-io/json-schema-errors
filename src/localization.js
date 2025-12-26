import { readFile } from "node:fs/promises";
import { FluentBundle, FluentResource } from "@fluent/bundle";

/**
 * @import { FluentVariable} from "@fluent/bundle"
 * @import { Json } from "./index.js"
 */

export class Localization {
  /**
   * @param {string} locale
   * @param {FluentBundle} bundle
   */
  constructor(locale, bundle) {
    this.locale = locale;
    this.bundle = bundle;
    this.disjunction = new Intl.ListFormat(this.locale, { type: "disjunction" });
    this.conjunction = new Intl.ListFormat(this.locale, { type: "conjunction" });
  }

  /** @type (locale: string) => Promise<Localization> */
  static async forLocale(locale) {
    try {
      const ftl = await readFile(`${import.meta.dirname}/translations/${locale}.ftl`, "utf-8");
      const resource = new FluentResource(ftl);
      const bundle = new FluentBundle(locale);
      bundle.addResource(resource);

      return new Localization(locale, bundle);
    } catch (error) {
      throw Error(`The ${locale} locale is not supported.`, { cause: error });
    }
  }

  /** @type (messageId: string, args: Record<string, FluentVariable>) => string */
  #formatMessage(messageId, args) {
    const message = this.bundle.getMessage(messageId);
    if (!message?.value) {
      throw Error(`Message '${messageId}' not found.`);
    }
    return this.bundle.formatPattern(message.value, args);
  }

  getBooleanSchemaErrorMessage() {
    return this.#formatMessage("boolean-schema-error", {});
  }

  /** @type (expectedTypes: string[]) => string */
  getTypeErrorMessage(expectedTypes) {
    return this.#formatMessage("type-error", {
      expectedTypes: this.disjunction.format(expectedTypes)
    });
  }

  /** @type (expected: Json) => string */
  getConstErrorMessage(expected) {
    return this.#formatMessage("const-error", {
      expected: JSON.stringify(expected, null, "  ")
    });
  }

  /** @type (expected: Json[]) => string */
  getEnumErrorMessage(expected) {
    const expectedJson = expected.map((value) => JSON.stringify(value));
    return this.#formatMessage("enum-error", {
      expected: this.disjunction.format(expectedJson)
    });
  }

  /** @type (format: string) => string */
  getFormatErrorMessage(format) {
    return this.#formatMessage("format-error", { format });
  }

  /** @type (exclusiveMaximum: number) => string */
  getExclusiveMaximumErrorMessage(exclusiveMaximum) {
    return this.#formatMessage("exclusiveMaximum-error", { exclusiveMaximum });
  }

  /** @type (maximum: number) => string */
  getMaximumErrorMessage(maximum) {
    return this.#formatMessage("maximum-error", { maximum });
  }

  /** @type (exclusiveMinimum: number) => string */
  getExclusiveMinimumErrorMessage(exclusiveMinimum) {
    return this.#formatMessage("exclusiveMinimum-error", { exclusiveMinimum });
  }

  /** @type (minimum: number) => string */
  getMinimumErrorMessage(minimum) {
    return this.#formatMessage("minimum-error", { minimum });
  }

  /** @type (multipleOf: number) => string */
  getMultipleOfErrorMessage(multipleOf) {
    return this.#formatMessage("multipleOf-error", { multipleOf });
  }

  /** @type (maxLength: number) => string */
  getMaxLengthErrorMessage(maxLength) {
    return this.#formatMessage("maxLength-error", { maxLength });
  }

  /** @type (minLength: number) => string */
  getMinLengthErrorMessage(minLength) {
    return this.#formatMessage("minLength-error", { minLength });
  }

  /** @type (pattern: string) => string */
  getPatternErrorMessage(pattern) {
    return this.#formatMessage("pattern-error", { pattern });
  }

  /** @type (maxItems: number) => string */
  getMaxItemsErrorMessage(maxItems) {
    return this.#formatMessage("maxItems-error", { maxItems });
  }

  /** @type (minItems: number) => string */
  getMinItemsErrorMessage(minItems) {
    return this.#formatMessage("minItems-error", { minItems });
  }

  /** @type () => string */
  getUniqueItemsErrorMessage() {
    return this.#formatMessage("uniqueItems-error", {});
  }

  /** @type (maxProperties: number) => string */
  getMaxPropertiesErrorMessage(maxProperties) {
    return this.#formatMessage("maxProperties-error", { maxProperties });
  }

  /** @type (minProperties: number) => string */
  getMinPropertiesErrorMessage(minProperties) {
    return this.#formatMessage("minProperties-error", { minProperties });
  }

  /** @type (required: string[]) => string */
  getRequiredErrorMessage(required) {
    return this.#formatMessage("required-error", {
      required: this.conjunction.format(required),
      count: required.length
    });
  }
}
