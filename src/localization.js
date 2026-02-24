import { readFile } from "node:fs/promises";
import { FluentBundle, FluentResource } from "@fluent/bundle";

/**
 * @import { FluentVariable} from "@fluent/bundle"
 * @import { Json } from "./index.js"
 */

/**
 * @typedef {{
 *   minContains?: number;
 *   maxContains?: number;
 * }} ContainsRange
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
    return this.#formatMessage("boolean-schema-message", {});
  }

  /** @type (expectedTypes: string[]) => string */
  getTypeErrorMessage(expectedTypes) {
    return this.#formatMessage("type-message", {
      expectedTypes: this.disjunction.format(expectedTypes)
    });
  }

  /** @type (expected: Json[]) => string */
  getEnumErrorMessage(expected) {
    if (expected.length === 1) {
      return this.#formatMessage("const-message", {
        expected: JSON.stringify(expected[0], null, "  ")
      });
    } else {
      const expectedJson = expected.map((value) => JSON.stringify(value));
      return this.#formatMessage("enum-message", {
        expected: this.disjunction.format(expectedJson)
      });
    }
  }

  /** @type (format: string) => string */
  getFormatErrorMessage(format) {
    return this.#formatMessage("format-message", { format });
  }

  /** @type (exclusiveMaximum: number) => string */
  getExclusiveMaximumErrorMessage(exclusiveMaximum) {
    return this.#formatMessage("exclusiveMaximum-message", { exclusiveMaximum });
  }

  /** @type (maximum: number) => string */
  getMaximumErrorMessage(maximum) {
    return this.#formatMessage("maximum-message", { maximum });
  }

  /** @type (exclusiveMinimum: number) => string */
  getExclusiveMinimumErrorMessage(exclusiveMinimum) {
    return this.#formatMessage("exclusiveMinimum-message", { exclusiveMinimum });
  }

  /** @type (minimum: number) => string */
  getMinimumErrorMessage(minimum) {
    return this.#formatMessage("minimum-message", { minimum });
  }

  /** @type (multipleOf: number) => string */
  getMultipleOfErrorMessage(multipleOf) {
    return this.#formatMessage("multipleOf-message", { multipleOf });
  }

  /** @type (maxLength: number) => string */
  getMaxLengthErrorMessage(maxLength) {
    return this.#formatMessage("maxLength-message", { maxLength });
  }

  /** @type (minLength: number) => string */
  getMinLengthErrorMessage(minLength) {
    return this.#formatMessage("minLength-message", { minLength });
  }

  /** @type (pattern: string) => string */
  getPatternErrorMessage(pattern) {
    return this.#formatMessage("pattern-message", { pattern });
  }

  /** @type (maxItems: number) => string */
  getMaxItemsErrorMessage(maxItems) {
    return this.#formatMessage("maxItems-message", { maxItems });
  }

  /** @type (minItems: number) => string */
  getMinItemsErrorMessage(minItems) {
    return this.#formatMessage("minItems-message", { minItems });
  }

  /** @type (range: ContainsRange) => string */
  getContainsErrorMessage(range) {
    range.minContains ??= 1;

    if (range.minContains === range.maxContains) {
      return this.#formatMessage("contains-exact-message", range);
    } else if (range.maxContains) {
      return this.#formatMessage("contains-range-message", range);
    } else {
      return this.#formatMessage("contains-message", range);
    }
  }

  /** @type () => string */
  getUniqueItemsErrorMessage() {
    return this.#formatMessage("uniqueItems-message", {});
  }

  /** @type (maxProperties: number) => string */
  getMaxPropertiesErrorMessage(maxProperties) {
    return this.#formatMessage("maxProperties-message", { maxProperties });
  }

  /** @type (minProperties: number) => string */
  getMinPropertiesErrorMessage(minProperties) {
    return this.#formatMessage("minProperties-message", { minProperties });
  }

  /** @type (required: string[]) => string */
  getRequiredErrorMessage(required) {
    return this.#formatMessage("required-message", {
      required: this.conjunction.format(required),
      count: required.length
    });
  }

  /** @type () => string */
  getAnyOfErrorMessage() {
    return this.#formatMessage("anyOf-message", {});
  }

  /** @type (matchCount: number) => string */
  getOneOfErrorMessage(matchCount) {
    return this.#formatMessage("oneOf-message", { matchCount });
  }

  /** @type () => string */
  getNotErrorMessage() {
    return this.#formatMessage("not-message", {});
  }

  /** @type (keyword: string) => string */
  getUnknownErrorMessage(keyword) {
    return this.#formatMessage("unknown-message", { keyword });
  }
}
