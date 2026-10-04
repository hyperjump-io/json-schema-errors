import { translations } from "./translations/index.js";
import { FluentBundle, FluentResource } from "@fluent/bundle";

/**
 * @import { FluentVariable} from "@fluent/bundle"
 * @import { ContainsRange, Json } from "./index.d.ts"
 */

/** @type Map<string, Localization> */
const localizationCache = new Map();

export class Localization {
  /** @type Localization | undefined */
  #negated;

  /**
   * @param {string} locale
   * @param {FluentBundle} bundle
   * @param {boolean} [isNegated]
   */
  constructor(locale, bundle, isNegated = false) {
    this.locale = locale;
    this.bundle = bundle;
    this.isNegated = isNegated;
    this.disjunction = new Intl.ListFormat(this.locale, { type: "disjunction" });
    this.conjunction = new Intl.ListFormat(this.locale, { type: "conjunction" });
  }

  /**
   * A view of this localization where success messages describe what would
   * make the keyword fail instead of what it requires. It's used to explain
   * failures of keywords like 'not' that fail when a subschema passes.
   *
   * @type () => Localization
   */
  negated() {
    this.#negated ??= new Localization(this.locale, this.bundle, true);
    return this.#negated;
  }

  /** @type (locale: string) => Localization */
  static forLocale(locale) {
    if (!localizationCache.has(locale)) {
      const translation = translations[locale];
      if (!translation) {
        throw Error(`The ${locale} locale is not supported.`);
      }
      const resource = new FluentResource(translation.ftl);
      const bundle = new FluentBundle(locale, { useIsolating: translation.direction === "rtl" });
      bundle.addResource(resource);
      localizationCache.set(locale, new Localization(locale, bundle));
    }

    return /** @type Localization */ (localizationCache.get(locale));
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

  /** @type (types: string[]) => string */
  getTypeSuccessMessage(types) {
    return this.#formatMessage(this.isNegated ? "type-negated-message" : "type-success-message", {
      type: types[0],
      types: this.disjunction.format(types),
      count: types.length
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

  /** @type (pattern: string) => string */
  getPatternSuccessMessage(pattern) {
    return this.#formatMessage(this.isNegated ? "pattern-negated-message" : "pattern-success-message", { pattern });
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

  /** @type (maxContains: number) => string */
  getContainsTooManyErrorMessage(maxContains) {
    return this.#formatMessage("contains-too-many-message", { maxContains });
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

  /** @type (required: string[]) => string */
  getRequiredSuccessMessage(required) {
    if (this.isNegated) {
      return this.#formatMessage("required-negated-message", {
        required: this.disjunction.format(required),
        count: required.length
      });
    } else {
      return this.#formatMessage("required-success-message", {
        required: this.conjunction.format(required),
        count: required.length
      });
    }
  }

  /** @type (property: string, required: string[]) => string */
  getDependentRequiredSuccessMessage(property, required) {
    if (this.isNegated) {
      return this.#formatMessage("dependentRequired-negated-message", {
        property,
        required: this.disjunction.format(required),
        count: required.length
      });
    } else {
      return this.#formatMessage("dependentRequired-success-message", {
        property,
        required: this.conjunction.format(required),
        count: required.length
      });
    }
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
  getOneOfMultipleMatchesErrorMessage() {
    return this.#formatMessage("oneOf-multiple-matches-message", {});
  }

  /** @type (count: number) => string */
  getNotErrorMessage(count) {
    return this.#formatMessage("not-message", { count });
  }

  /** @type (keyword: string) => string */
  getUnknownErrorMessage(keyword) {
    return this.#formatMessage("unknown-message", { keyword });
  }
}
