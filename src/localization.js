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

  /** @type (minimum: number) => string */
  getMinimumErrorMessage(minimum) {
    return this.#formatMessage("minimum-error", { minimum });
  }
}
