import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

const keywordUris = [
  "https://json-schema.org/keyword/draft-2020-12/format",
  "https://json-schema.org/keyword/draft-2020-12/format-assertion",
  "https://json-schema.org/keyword/draft-2019-09/format",
  "https://json-schema.org/keyword/draft-2019-09/format-assertion",
  "https://json-schema.org/keyword/draft-07/format",
  "https://json-schema.org/keyword/draft-06/format",
  "https://json-schema.org/keyword/draft-04/format"
];

/** @type ErrorHandler */
const formatErrorHandler = {
  error: (normalizedErrors, instance, localization, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const keywordUri of keywordUris) {
      for (const schemaLocation in normalizedErrors[keywordUri]) {
        if (normalizedErrors[keywordUri][schemaLocation].valid !== false) {
          continue;
        }

        const format = /** @type string */ (getCompiledKeywordValue(context.ast, schemaLocation));

        errors.push({
          message: localization.getFormatErrorMessage(format),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, localization, context) => {
    // Whether 'format' is an assertion depends on how the validator is
    // configured, which we don't know, so the messages say that it only applies
    // if formats are validated. That includes 'format-assertion' because some
    // validators can be configured not to validate it either.
    return keywordUris.flatMap((keywordUri) => {
      return describeKeyword(normalizedOutput, keywordUri, instance, context.ast, (/** @type string */ format) => {
        return localization.getFormatSuccessMessage(format);
      });
    });
  }
};

export default formatErrorHandler;
