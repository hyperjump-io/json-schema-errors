import { setOutputFormat } from "@hyperjump/json-schema/experimental";
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
      const localization = Localization.forLocale(options.locale ?? "en-US");
      return getErrors(plugin.output, instance, localization, { ast: context.ast });
    }
  };
};

setOutputFormat(JSE, jseOutputFormatHandler);
