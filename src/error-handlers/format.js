import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword, getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

const keywordUris = [
  "https://json-schema.org/keyword/format",
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
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const keywordUri of keywordUris) {
      for (const schemaLocation in normalizedErrors[keywordUri]) {
        if (normalizedErrors[keywordUri][schemaLocation].valid !== false) {
          continue;
        }

        const format = /** @type string */ (getCompiledKeywordValue(context.ast, schemaLocation));

        errors.push({
          message: context.localization.getFormatErrorMessage(format),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    // A 'format' that's only an annotation doesn't require anything. If it's
    // not known, the message says that it only applies if formats are validated.
    return keywordUris.flatMap((keywordUri) => {
      return describeKeyword(normalizedOutput, keywordUri, instance, context.ast, (/** @type string */ format) => {
        switch (context.isFormatAsserted(keywordUri, format)) {
          case true:
            return context.localization.getFormatSuccessMessage(format);
          case false:
            return undefined;
          default:
            return context.localization.getFormatIfValidatedSuccessMessage(format);
        }
      });
    });
  }
};

export default formatErrorHandler;
