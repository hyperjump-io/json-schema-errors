import { getKeyword, setOutputFormat } from "@hyperjump/json-schema/experimental";
import { getShouldValidateFormat } from "@hyperjump/json-schema/draft-2020-12";
import { getErrors } from "./json-schema-errors.js";
import { Localization } from "./localization.js";
import { JsonSchemaErrorsOutputPlugin } from "./output-plugin.js";

/**
 * @import { OutputFormatHandler } from "@hyperjump/json-schema/experimental"
 */

export const JSE = "JSE";

/** @type OutputFormatHandler */
const jseOutputFormatHandler = (options) => {
  const plugin = new JsonSchemaErrorsOutputPlugin();
  return {
    plugin,
    getErrors: (instance, context) => {
      return getErrors(plugin.output, instance, {
        ast: context.ast,
        localization: Localization.forLocale(options.locale ?? "en-US"),
        isFormatAsserted
      });
    }
  };
};

/**
 * Whether @hyperjump/json-schema validates 'format' depends on the dialect and
 * on whether format validation is turned on or off. If it's not set, each
 * dialect has its own default.
 *
 * @type (keywordUri: string, format: string) => boolean | undefined
 */
const isFormatAsserted = (keywordUri, format) => {
  const shouldValidateFormat = getShouldValidateFormat();

  switch (keywordUri) {
    case "https://json-schema.org/keyword/draft-2020-12/format-assertion":
      // Always validated. Validation throws if a format isn't supported.
      return true;
    case "https://json-schema.org/keyword/format":
    case "https://json-schema.org/keyword/draft-2019-09/format-assertion":
    case "https://json-schema.org/keyword/draft-07/format":
    case "https://json-schema.org/keyword/draft-06/format":
    case "https://json-schema.org/keyword/draft-04/format":
      if (shouldValidateFormat === false) {
        return false;
      }
      break;
    case "https://json-schema.org/keyword/draft-2020-12/format":
    case "https://json-schema.org/keyword/draft-2019-09/format":
      if (shouldValidateFormat !== true) {
        return false;
      }
      break;
    default:
      return undefined;
  }

  // Formats that aren't supported always pass
  const { formats } = /** @type {{ formats: Record<string, string> }} */ (/** @type unknown */ (getKeyword(keywordUri)));
  return Object.hasOwn(formats, format);
};

setOutputFormat(JSE, jseOutputFormatHandler);
