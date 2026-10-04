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
   * @param {Localization} [negated]
   */
  constructor(locale, bundle, isNegated = false, negated) {
    this.locale = locale;
    this.bundle = bundle;
    this.isNegated = isNegated;
    this.#negated = negated;
    this.disjunction = new Intl.ListFormat(this.locale, { type: "disjunction" });
    this.conjunction = new Intl.ListFormat(this.locale, { type: "conjunction" });
  }

  /**
   * A view of this localization where success messages describe what would
   * make the keyword fail instead of what it requires. It's used to explain
   * failures of keywords like 'not' that fail when a subschema passes. Negating
   * a negated view gives back the original.
   *
   * @type () => Localization
   */
  negated() {
    this.#negated ??= new Localization(this.locale, this.bundle, !this.isNegated, this);
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

  /**
   * Success messages describe what a keyword requires. In a negated view, they
   * describe what would make the keyword fail.
   *
   * @type (keyword: string, args: Record<string, FluentVariable>) => string
   */
  #formatSuccessMessage(keyword, args) {
    return this.#formatMessage(`${keyword}-${this.isNegated ? "negated" : "success"}-message`, args);
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
    return this.#formatSuccessMessage("type", {
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
    return this.#formatSuccessMessage("pattern", { pattern });
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

  /** @type (property: string) => string */
  getHasPropertySuccessMessage(property) {
    return this.#formatSuccessMessage("hasProperty", { property });
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

  /** @type (maximum: number) => string */
  getMaximumSuccessMessage(maximum) {
    return this.#formatSuccessMessage("maximum", { maximum });
  }

  /** @type (exclusiveMaximum: number) => string */
  getExclusiveMaximumSuccessMessage(exclusiveMaximum) {
    return this.#formatSuccessMessage("exclusiveMaximum", { exclusiveMaximum });
  }

  /** @type (minimum: number) => string */
  getMinimumSuccessMessage(minimum) {
    return this.#formatSuccessMessage("minimum", { minimum });
  }

  /** @type (exclusiveMinimum: number) => string */
  getExclusiveMinimumSuccessMessage(exclusiveMinimum) {
    return this.#formatSuccessMessage("exclusiveMinimum", { exclusiveMinimum });
  }

  /** @type (multipleOf: number) => string */
  getMultipleOfSuccessMessage(multipleOf) {
    return this.#formatSuccessMessage("multipleOf", { multipleOf });
  }

  /** @type (maxLength: number) => string */
  getMaxLengthSuccessMessage(maxLength) {
    return this.#formatSuccessMessage("maxLength", { maxLength });
  }

  /** @type (minLength: number) => string */
  getMinLengthSuccessMessage(minLength) {
    return this.#formatSuccessMessage("minLength", { minLength });
  }

  /** @type (format: string) => string */
  getFormatSuccessMessage(format) {
    return this.#formatSuccessMessage("format", { format });
  }

  /** @type (maxItems: number) => string */
  getMaxItemsSuccessMessage(maxItems) {
    return this.#formatSuccessMessage("maxItems", { maxItems });
  }

  /** @type (minItems: number) => string */
  getMinItemsSuccessMessage(minItems) {
    return this.#formatSuccessMessage("minItems", { minItems });
  }

  /** @type (maxProperties: number) => string */
  getMaxPropertiesSuccessMessage(maxProperties) {
    return this.#formatSuccessMessage("maxProperties", { maxProperties });
  }

  /** @type (minProperties: number) => string */
  getMinPropertiesSuccessMessage(minProperties) {
    return this.#formatSuccessMessage("minProperties", { minProperties });
  }

  getUniqueItemsSuccessMessage() {
    return this.#formatSuccessMessage("uniqueItems", {});
  }

  /** @type (expected: Json[]) => string */
  getEnumSuccessMessage(expected) {
    if (expected.length === 1) {
      return this.#formatSuccessMessage("const", {
        expected: JSON.stringify(expected[0], null, "  ")
      });
    } else {
      const expectedJson = expected.map((value) => JSON.stringify(value));
      return this.#formatSuccessMessage("enum", {
        expected: this.disjunction.format(expectedJson)
      });
    }
  }

  /** @type () => string */
  getAnyOfErrorMessage() {
    return this.#formatMessage("anyOf-message", {});
  }

  getOneOfErrorMessage() {
    return this.#formatMessage("oneOf-message", {});
  }

  getOneOfTooManyErrorMessage() {
    return this.#formatMessage("oneOf-too-many-message", {});
  }

  /** @type () => string */
  getOneOfMultipleMatchesErrorMessage() {
    return this.#formatMessage("oneOf-multiple-matches-message", {});
  }

  /** @type (quantifier: "one" | "all" | "some") => string */
  getNotErrorMessage(quantifier) {
    return this.#formatMessage("not-message", { quantifier });
  }

  getAnyValueMessage() {
    return this.#formatMessage("any-value-message", {});
  }

  /** @type (min: number, max: number) => string */
  getCountTrueMessage(min, max) {
    if (min <= 0) {
      return this.#formatMessage("count-true-message", { kind: "atMost", max });
    } else if (min === max) {
      return this.#formatMessage("count-true-message", { kind: "exactly", min });
    } else if (max === Infinity) {
      return this.#formatMessage("count-true-message", { kind: "atLeast", min });
    } else {
      return this.#formatMessage("count-true-message", { kind: "between", min, max });
    }
  }

  getAllTrueMessage() {
    return this.#formatMessage("all-true-message", {});
  }

  /** @type (keyword: string) => string */
  getUnknownErrorMessage(keyword) {
    return this.#formatMessage("unknown-message", { keyword });
  }
}
