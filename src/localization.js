import { translations } from "./translations/index.js";
import { FluentBundle, FluentResource } from "@fluent/bundle";

/**
 * @import { FluentVariable} from "@fluent/bundle"
 * @import { ContainsRange, Json } from "./index.d.ts"
 */

const DEFAULT_LOCALE = "en-US";

/** @type Map<string, FluentBundle> */
const bundles = new Map();

/** @type Map<string, Localization> */
const localizationCache = new Map();

/** @type (locale: string, direction: "ltr" | "rtl") => FluentBundle */
const createBundle = (locale, direction) => {
  return new FluentBundle(locale, { useIsolating: direction === "rtl" });
};

/** @type (locale: string) => FluentBundle | undefined */
const getBundle = (locale) => {
  if (!bundles.has(locale)) {
    const translation = translations[locale];
    if (!translation) {
      return undefined;
    }

    const bundle = createBundle(locale, translation.direction);
    bundle.addResource(new FluentResource(translation.ftl));
    bundles.set(locale, bundle);
  }

  return bundles.get(locale);
};

/**
 * @type (locale: string, ftl: string, options?: { direction?: "ltr" | "rtl" }) => void
 */
export const addTranslation = (locale, ftl, options = {}) => {
  let bundle = getBundle(locale);
  if (!bundle) {
    bundle = createBundle(locale, options.direction ?? "ltr");
    bundles.set(locale, bundle);
  }

  bundle.addResource(new FluentResource(ftl), { allowOverrides: true });
};

export class Localization {
  /** @type Localization | undefined */
  #negated;

  /** @type Intl.ListFormat */
  #disjunction;

  /** @type Intl.ListFormat */
  #conjunction;

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
    this.#disjunction = new Intl.ListFormat(this.locale, { type: "disjunction" });
    this.#conjunction = new Intl.ListFormat(this.locale, { type: "conjunction" });
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
      const bundle = getBundle(locale);
      if (!bundle) {
        throw Error(`The ${locale} locale is not supported.`);
      }
      localizationCache.set(locale, new Localization(locale, bundle));
    }

    return /** @type Localization */ (localizationCache.get(locale));
  }

  /**
   * Formats a message. Messages that haven't been translated for this locale
   * fall back to en-US.
   *
   * @type (messageId: string, args?: Record<string, FluentVariable>) => string
   */
  format(messageId, args = {}) {
    for (const bundle of [this.bundle, getBundle(DEFAULT_LOCALE)]) {
      const message = bundle?.getMessage(messageId);
      if (bundle && message?.value) {
        return bundle.formatPattern(message.value, args);
      }
    }

    throw Error(`Message '${messageId}' not found.`);
  }

  /**
   * Success messages describe what a keyword requires. In a negated view, they
   * describe what would make the keyword fail. The message ids are
   * `{keyword}-success-message` and `{keyword}-negated-message`.
   *
   * @type (keyword: string, args?: Record<string, FluentVariable>) => string
   */
  formatRequirement(keyword, args = {}) {
    return this.format(`${keyword}-${this.isNegated ? "negated" : "success"}-message`, args);
  }

  /**
   * A list where one of the items applies, such as "a, b, or c".
   *
   * @type (items: string[]) => string
   */
  or(items) {
    return this.#disjunction.format(items);
  }

  /**
   * A list where all of the items apply, such as "a, b, and c".
   *
   * @type (items: string[]) => string
   */
  and(items) {
    return this.#conjunction.format(items);
  }

  getBooleanSchemaErrorMessage() {
    return this.format("boolean-schema-message", {});
  }

  /** @type (expectedTypes: string[]) => string */
  getTypeErrorMessage(expectedTypes) {
    return this.format("type-message", {
      type: expectedTypes[0],
      expectedTypes: this.or(expectedTypes),
      count: expectedTypes.length
    });
  }

  /** @type (types: string[]) => string */
  getTypeSuccessMessage(types) {
    return this.formatRequirement("type", {
      type: types[0],
      types: this.or(types),
      count: types.length
    });
  }

  /** @type (expected: Json[]) => string */
  getEnumErrorMessage(expected) {
    if (expected.length === 1) {
      return this.format("const-message", {
        expected: JSON.stringify(expected[0], null, "  ")
      });
    } else {
      const expectedJson = expected.map((value) => JSON.stringify(value));
      return this.format("enum-message", {
        expected: this.or(expectedJson)
      });
    }
  }

  /** @type (names: string[]) => string[] */
  #propertyNames(names) {
    return names.map((name) => this.format("property-name", { name }));
  }

  /** @type (format: string) => string */
  getFormatErrorMessage(format) {
    return this.format("format-message", { format });
  }

  /** @type (exclusiveMaximum: number) => string */
  getExclusiveMaximumErrorMessage(exclusiveMaximum) {
    return this.format("exclusiveMaximum-message", { exclusiveMaximum });
  }

  /** @type (maximum: number) => string */
  getMaximumErrorMessage(maximum) {
    return this.format("maximum-message", { maximum });
  }

  /** @type (exclusiveMinimum: number) => string */
  getExclusiveMinimumErrorMessage(exclusiveMinimum) {
    return this.format("exclusiveMinimum-message", { exclusiveMinimum });
  }

  /** @type (minimum: number) => string */
  getMinimumErrorMessage(minimum) {
    return this.format("minimum-message", { minimum });
  }

  /** @type (multipleOf: number) => string */
  getMultipleOfErrorMessage(multipleOf) {
    return this.format("multipleOf-message", { multipleOf });
  }

  /** @type (maxLength: number) => string */
  getMaxLengthErrorMessage(maxLength) {
    return this.format("maxLength-message", { maxLength });
  }

  /** @type (minLength: number) => string */
  getMinLengthErrorMessage(minLength) {
    return this.format("minLength-message", { minLength });
  }

  /** @type (pattern: string) => string */
  getPatternErrorMessage(pattern) {
    return this.format("pattern-message", { pattern });
  }

  /** @type (pattern: string) => string */
  getPatternSuccessMessage(pattern) {
    return this.formatRequirement("pattern", { pattern });
  }

  /** @type (maxItems: number) => string */
  getMaxItemsErrorMessage(maxItems) {
    return this.format("maxItems-message", { maxItems });
  }

  /** @type (minItems: number) => string */
  getMinItemsErrorMessage(minItems) {
    return this.format("minItems-message", { minItems });
  }

  /**
   * When the 'contains' schema can be described, the description follows the
   * message. Otherwise, the message has to refer to the schema.
   *
   * @type (range: ContainsRange, isDescribed: boolean) => string
   */
  getContainsErrorMessage(range, isDescribed) {
    range.minContains ??= 1;
    const prefix = isDescribed ? "contains" : "contains-schema";

    if (range.minContains === range.maxContains) {
      return this.format(`${prefix}-exact-message`, range);
    } else if (range.maxContains) {
      return this.format(`${prefix}-range-message`, range);
    } else {
      return this.format(`${prefix}-message`, range);
    }
  }

  /** @type (maxContains: number) => string */
  getContainsTooManyErrorMessage(maxContains) {
    return this.format("contains-too-many-message", { maxContains });
  }

  /** @type () => string */
  getUniqueItemsErrorMessage() {
    return this.format("uniqueItems-message", {});
  }

  /** @type (maxProperties: number) => string */
  getMaxPropertiesErrorMessage(maxProperties) {
    return this.format("maxProperties-message", { maxProperties });
  }

  /** @type (minProperties: number) => string */
  getMinPropertiesErrorMessage(minProperties) {
    return this.format("minProperties-message", { minProperties });
  }

  /** @type (required: string[]) => string */
  getRequiredErrorMessage(required) {
    return this.format("required-message", {
      required: this.and(required),
      count: required.length
    });
  }

  /** @type (required: string[]) => string */
  getRequiredSuccessMessage(required) {
    if (this.isNegated) {
      return this.format("required-negated-message", {
        required: this.or(this.#propertyNames(required)),
        count: required.length
      });
    } else {
      return this.format("required-success-message", {
        required: this.and(this.#propertyNames(required)),
        count: required.length
      });
    }
  }

  /** @type (pattern: string, count: number) => string */
  getEachMatchingPropertySuccessMessage(pattern, count) {
    return this.formatRequirement("eachMatchingProperty", { pattern, count });
  }

  /** @type (pattern: string) => string */
  getNoMatchingPropertySuccessMessage(pattern) {
    return this.formatRequirement("noMatchingProperty", { pattern });
  }

  /** @type (properties: string[], patterns: string[], count: number) => string */
  getEachAdditionalPropertySuccessMessage(properties, patterns, count) {
    return this.formatRequirement("eachAdditionalProperty", { ...this.#additionalPropertiesScope(properties, patterns), count });
  }

  /** @type (properties: string[], patterns: string[]) => string */
  getNoAdditionalPropertySuccessMessage(properties, patterns) {
    return this.formatRequirement("noAdditionalProperty", this.#additionalPropertiesScope(properties, patterns));
  }

  /** @type (properties: string[], patterns: string[]) => Record<string, FluentVariable> */
  #additionalPropertiesScope(properties, patterns) {
    const scope = properties.length && patterns.length ? "both" : properties.length ? "names" : patterns.length ? "patterns" : "all";
    return {
      scope,
      properties: this.and(this.#propertyNames(properties)),
      patterns: this.or(patterns.map((pattern) => `/${pattern}/`))
    };
  }

  /** @type (count: number) => string */
  getEachPropertyNameSuccessMessage(count) {
    return this.formatRequirement("eachPropertyName", { count });
  }

  /** @type (index: number, count: number) => string */
  getEachItemSuccessMessage(index, count) {
    return this.formatRequirement("eachItem", { index, count });
  }

  /** @type (index: number) => string */
  getHasItemSuccessMessage(index) {
    return this.formatRequirement("hasItem", { index });
  }

  /** @type (properties: string[]) => string */
  getHasPropertySuccessMessage(properties) {
    return this.formatRequirement("hasProperty", {
      properties: this.isNegated
        ? this.and(this.#propertyNames(properties))
        : this.or(this.#propertyNames(properties)),
      count: properties.length
    });
  }

  /** @type (property: string, required: string[]) => string */
  getDependentRequiredSuccessMessage(property, required) {
    if (this.isNegated) {
      return this.format("dependentRequired-negated-message", {
        property: this.#propertyNames([property])[0],
        required: this.or(this.#propertyNames(required)),
        count: required.length
      });
    } else {
      return this.format("dependentRequired-success-message", {
        property: this.#propertyNames([property])[0],
        required: this.and(this.#propertyNames(required)),
        count: required.length
      });
    }
  }

  /** @type (maximum: number) => string */
  getMaximumSuccessMessage(maximum) {
    return this.formatRequirement("maximum", { maximum });
  }

  /** @type (exclusiveMaximum: number) => string */
  getExclusiveMaximumSuccessMessage(exclusiveMaximum) {
    return this.formatRequirement("exclusiveMaximum", { exclusiveMaximum });
  }

  /** @type (minimum: number) => string */
  getMinimumSuccessMessage(minimum) {
    return this.formatRequirement("minimum", { minimum });
  }

  /** @type (exclusiveMinimum: number) => string */
  getExclusiveMinimumSuccessMessage(exclusiveMinimum) {
    return this.formatRequirement("exclusiveMinimum", { exclusiveMinimum });
  }

  /** @type (multipleOf: number) => string */
  getMultipleOfSuccessMessage(multipleOf) {
    return this.formatRequirement("multipleOf", { multipleOf });
  }

  /** @type (maxLength: number) => string */
  getMaxLengthSuccessMessage(maxLength) {
    return this.formatRequirement("maxLength", { maxLength });
  }

  /** @type (minLength: number) => string */
  getMinLengthSuccessMessage(minLength) {
    return this.formatRequirement("minLength", { minLength });
  }

  /** @type (format: string) => string */
  getFormatSuccessMessage(format) {
    return this.formatRequirement("format", { format });
  }

  /** @type (format: string) => string */
  getFormatIfValidatedSuccessMessage(format) {
    return this.formatRequirement("formatIfValidated", { format });
  }

  /** @type (maxItems: number) => string */
  getMaxItemsSuccessMessage(maxItems) {
    return this.formatRequirement("maxItems", { maxItems });
  }

  /** @type (minItems: number) => string */
  getMinItemsSuccessMessage(minItems) {
    return this.formatRequirement("minItems", { minItems });
  }

  /** @type (maxProperties: number) => string */
  getMaxPropertiesSuccessMessage(maxProperties) {
    return this.formatRequirement("maxProperties", { maxProperties });
  }

  /** @type (minProperties: number) => string */
  getMinPropertiesSuccessMessage(minProperties) {
    return this.formatRequirement("minProperties", { minProperties });
  }

  getUniqueItemsSuccessMessage() {
    return this.formatRequirement("uniqueItems", {});
  }

  /** @type (expected: Json[]) => string */
  getEnumSuccessMessage(expected) {
    if (expected.length === 1) {
      return this.formatRequirement("const", {
        expected: JSON.stringify(expected[0], null, "  ")
      });
    } else {
      const expectedJson = expected.map((value) => JSON.stringify(value));
      return this.formatRequirement("enum", {
        expected: this.or(expectedJson)
      });
    }
  }

  /** @type () => string */
  getAnyOfErrorMessage() {
    return this.format("anyOf-message", {});
  }

  getOneOfErrorMessage() {
    return this.format("oneOf-message", {});
  }

  getOneOfTooManyErrorMessage() {
    return this.format("oneOf-too-many-message", {});
  }

  /** @type () => string */
  getOneOfMultipleMatchesErrorMessage() {
    return this.format("oneOf-multiple-matches-message", {});
  }

  /** @type (quantifier: "one" | "all" | "some") => string */
  getNotErrorMessage(quantifier) {
    return this.format("not-message", { quantifier });
  }

  getAnyValueMessage() {
    return this.format("any-value-message", {});
  }

  /** @type (min: number, max: number) => string */
  getCountTrueMessage(min, max) {
    if (min <= 0) {
      return this.format("count-true-message", { kind: "atMost", max });
    } else if (min === max) {
      return this.format("count-true-message", { kind: "exactly", min });
    } else if (max === Infinity) {
      return this.format("count-true-message", { kind: "atLeast", min });
    } else {
      return this.format("count-true-message", { kind: "between", min, max });
    }
  }

  /** @type (count: number) => string */
  getNotShownMessage(count) {
    return this.format("not-shown-message", { count });
  }

  getDetailsNotShownMessage() {
    return this.format("details-not-shown-message", {});
  }

  getAllTrueMessage() {
    return this.format("all-true-message", {});
  }

  /** @type (keyword: string) => string */
  getUnknownErrorMessage(keyword) {
    return this.format("unknown-message", { keyword });
  }
}
