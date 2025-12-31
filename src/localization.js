import { readFile } from "node:fs/promises";
import { FluentBundle, FluentResource } from "@fluent/bundle";
import leven from "leven";

/**
 * @import { FluentVariable} from "@fluent/bundle"
 * @import { Json } from "./index.d.ts"
 */

/**
 * @typedef {{
 *   minimum?: number;
 *   exclusiveMinimum?: boolean;
 *   maximum?: number;
 *   exclusiveMaximum?: boolean;
 *   multipleOf?: number;
 * }} NumberConstraints
 */

/**
 * @typedef {{
 *   minLength?: number;
 *   maxLength?: number;
 *   pattern? : string;
 * }} StringConstraints
 */

/**
 * @typedef {{
 *   maxContains?: number;
 *   minContains: number;
 * }} ContainsConstraints
 */

/**
 * @typedef {{
 *   minItems?: number;
 *   maxItems?: number;
 * }} ArrayConstraints
 */

/**
 * @typedef {{
 *   maxProperties?: number;
 *   minProperties?: number;
 * }} PropertiesConstraints
 */

/**
 * @typedef {{
 *   allowedValues?: Json[],
 *   allowedTypes?: string[]
 * }} ValueConstraints
 */

export class Localization {
  /**
   * @param {string} locale
   * @param {FluentBundle} bundle
   */
  constructor(locale, bundle) {
    this.locale = locale;
    this.bundle = bundle;
  }

  /** @type (locale: string) => Promise<Localization> */
  static async forLocale(locale) {
    const ftl = await readFile(`${import.meta.dirname}/translations/${locale}.ftl`, "utf-8");
    const resource = new FluentResource(ftl);

    const bundle = new FluentBundle(locale);
    let errors = bundle.addResource(resource);
    if (errors.length) {
      throw Error("Failed to load localization file");
    }

    return new Localization(locale, bundle);
  }

  /**
   * @private
   * @param {string} messageId
   * @param {Record<string, FluentVariable>} [args]
   * @returns {string}
   */
  _formatMessage(messageId, args) {
    const message = this.bundle.getMessage(messageId);
    if (!message?.value) {
      return `Localization error: message '${messageId}' not found.`;
    }
    return this.bundle.formatPattern(message.value, args);
  }

  /** @type (expectedTypes: string | string[], actualType: string) => string */
  getTypeErrorMessage(expectedTypes, actualType) {
    const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
    const expected = new Intl.ListFormat(this.locale, { type: "disjunction" }).format(
      types.map((type) => JSON.stringify(type))
    );

    return this._formatMessage("type-error", {
      expected,
      actual: JSON.stringify(actualType)
    });
  }

  /** @type (constraints: NumberConstraints) => string */
  getNumberErrorMessage(constraints) {
    /** @type string[] */
    const messages = [];

    if (constraints.minimum !== undefined) {
      if (constraints.exclusiveMinimum) {
        messages.push(this._formatMessage("number-error-exclusive-minimum", constraints));
      } else {
        messages.push(this._formatMessage("number-error-minimum", constraints));
      }
    }

    if (constraints.maximum !== undefined) {
      if (constraints.exclusiveMaximum) {
        messages.push(this._formatMessage("number-error-exclusive-maximum", constraints));
      } else {
        messages.push(this._formatMessage("number-error-maximum", constraints));
      }
    }

    return this._formatMessage("number-error", {
      constraints: new Intl.ListFormat(this.locale, { type: "conjunction" }).format(messages)
    });
  }

  /** @type (constraints: StringConstraints) => string */
  getStringErrorMessage(constraints) {
    /** @type string[] */
    const messages = [];

    if (constraints.minLength) {
      messages.push(this._formatMessage("string-error-minLength", constraints));
    }

    if (constraints.maxLength) {
      messages.push(this._formatMessage("string-error-maxLength", constraints));
    }

    return this._formatMessage("string-error", {
      constraints: new Intl.ListFormat(this.locale, { type: "conjunction" }).format(messages)
    });
  }

  /** @type (missingProperties: string[]) => string */
  getRequiredErrorMessage(missingProperties) {
    return this._formatMessage("required-error", {
      missingProperties: new Intl.ListFormat(this.locale, { type: "conjunction" }).format(missingProperties)
    });
  }

  /** @type (divisor: number) => string */
  getMultipleOfErrorMessage(divisor) {
    return this._formatMessage("multiple-of-error", { divisor });
  }

  /** @type (expectedValue: FluentVariable) => string */
  getConstErrorMessage(expectedValue) {
    return this._formatMessage("const-error", { expectedValue });
  }

  /** @type (constraints: PropertiesConstraints) => string */
  getPropertiesErrorMessage(constraints) {
    /** @type string[] */
    const messages = [];

    if (constraints.minProperties) {
      messages.push(this._formatMessage("properties-error-min", constraints));
    }

    if (constraints.maxProperties) {
      messages.push(this._formatMessage("properties-error-max", constraints));
    }

    return this._formatMessage("properties-error", {
      constraints: new Intl.ListFormat(this.locale, { type: "conjunction" }).format(messages)
    });
  }

  /** @type (constraints: ArrayConstraints) => string */
  getArrayErrorMessage(constraints) {
    /** @type string[] */
    const messages = [];

    if (constraints.minItems !== undefined) {
      messages.push(this._formatMessage("array-error-min", constraints));
    }

    if (constraints.maxItems !== undefined) {
      messages.push(this._formatMessage("array-error-max", constraints));
    }

    return this._formatMessage("array-error", {
      constraints: new Intl.ListFormat(this.locale, { type: "conjunction" }).format(messages)
    });
  }

  /** @type () => string */
  getUniqueItemsErrorMessage() {
    return this._formatMessage("unique-items-error");
  }

  /** @type (format: string) => string */
  getFormatErrorMessage(format) {
    return this._formatMessage("format-error", { format });
  }

  /** @type (pattern: string) => string */
  getPatternErrorMessage(pattern) {
    return this._formatMessage("pattern-error", { pattern });
  }

  /** @type (constraints: ContainsConstraints) => string */
  getContainsErrorMessage(constraints) {
    if (constraints.maxContains) {
      return this._formatMessage("contains-error-min-max", constraints);
    } else {
      return this._formatMessage("contains-error-min", constraints);
    }
  }

  /** @type () => string */
  getNotErrorMessage() {
    return this._formatMessage("not-error");
  }

  /** @type (propertyName: string) => string */
  getAdditionalPropertiesErrorMessage(propertyName) {
    return this._formatMessage("additional-properties-error", { propertyName });
  }

  /**
   * @param {ValueConstraints} constraints
   * @param {Json} currentValue
   * @returns {string}
   */
  getEnumErrorMessage(constraints, currentValue) {
    /** @type {"types" | "values" | "both"} */
    let variant = "both";

    /** @type string */
    let allowedValues = "";

    /** @type string */
    let expectedTypes = "";

    const instanceValue = JSON.stringify(currentValue);

    if (constraints.allowedValues && constraints.allowedValues.length > 0 && !constraints.allowedTypes?.length) {
      const bestMatch = constraints.allowedValues
        .map((value) => {
          const r = {
            value: JSON.stringify(value),
            weight: leven(JSON.stringify(value), instanceValue)
          };
          return r;
        })
        .sort((a, b) => a.weight - b.weight)[0];

      if (constraints.allowedValues.length === 1 || (bestMatch && bestMatch.weight < bestMatch.value.length)) {
        return this._formatMessage("enum-error-suggestion", {
          suggestion: bestMatch.value,
          instanceValue
        });
      }

      variant = "values";
      allowedValues = new Intl.ListFormat(this.locale, { type: "disjunction" })
        .format(constraints.allowedValues.map((value) => JSON.stringify(value)));
    }

    if (constraints.allowedTypes && constraints.allowedTypes.length > 0) {
      variant = variant === "values" ? "both" : "types";
      expectedTypes = new Intl.ListFormat(this.locale, { type: "disjunction" })
        .format(constraints.allowedTypes.map((value) => JSON.stringify(value)));
    }
    return this._formatMessage("enum-error-types-values", {
      variant,
      allowedValues,
      expectedTypes,
      instanceValue
    });
  }

  /** @type (descriptions: string[]) => string */
  getAnyOfBulletsErrorMessage(descriptions) {
    const constraints = "\n - " + descriptions.join("\n - ");
    return this._formatMessage("anyOf-error-bullets", { constraints });
  }

  /** @type () => string */
  getAnyOfErrorMessage() {
    return this._formatMessage("anyOf-error");
  }

  getNullDescription() {
    return this._formatMessage("null-description");
  }

  getBooleanDescription() {
    return this._formatMessage("boolean-description");
  }

  /** @type (constraints: NumberConstraints) => string */
  getNumberDescription(constraints) {
    /** @type string[] */
    const messages = [];

    if (constraints.minimum !== undefined) {
      if (constraints.exclusiveMinimum) {
        messages.push(this._formatMessage("number-error-exclusive-minimum", constraints));
      } else {
        messages.push(this._formatMessage("number-error-minimum", constraints));
      }
    }

    if (constraints.maximum !== undefined) {
      if (constraints.exclusiveMaximum) {
        messages.push(this._formatMessage("number-error-exclusive-maximum", constraints));
      } else {
        messages.push(this._formatMessage("number-error-maximum", constraints));
      }
    }

    if (constraints.multipleOf) {
      messages.push(this._formatMessage("number-error-multiple-of", constraints));
    }

    return this._formatMessage("number-description", {
      constraints: new Intl.ListFormat(this.locale).format(messages)
    });
  }

  /** @type (constraints: StringConstraints) => string */
  getStringDescription(constraints) {
    /** @type string[] */
    const messages = [];

    if (constraints.minLength) {
      messages.push(this._formatMessage("string-error-minLength", constraints));
    }

    if (constraints.maxLength) {
      messages.push(this._formatMessage("string-error-maxLength", constraints));
    }

    if (constraints.pattern) {
      messages.push(this._formatMessage("string-error-pattern", constraints));
    }

    return this._formatMessage("string-description", {
      constraints: new Intl.ListFormat(this.locale).format(messages)
    });
  }

  /** @type (constraints: ArrayConstraints) => string */
  getArrayDescription(constraints) {
    /** @type string[] */
    const messages = [];

    if (constraints.minItems !== undefined) {
      messages.push(this._formatMessage("array-error-min", constraints));
    }

    if (constraints.maxItems !== undefined) {
      messages.push(this._formatMessage("array-error-max", constraints));
    }

    return this._formatMessage("array-description", {
      constraints: new Intl.ListFormat(this.locale).format(messages)
    });
  }

  /** @type (constraints: PropertiesConstraints) => string */
  getObjectDescription(constraints) {
    /** @type string[] */
    const messages = [];

    if (constraints.minProperties) {
      messages.push(this._formatMessage("properties-error-min", constraints));
    }

    if (constraints.maxProperties) {
      messages.push(this._formatMessage("properties-error-max", constraints));
    }

    return this._formatMessage("object-description", {
      constraints: new Intl.ListFormat(this.locale).format(messages)
    });
  }

  getConflictingTypeMessage() {
    return this._formatMessage("conflicting-message");
  }
}
