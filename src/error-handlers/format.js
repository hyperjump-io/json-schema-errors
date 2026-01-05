import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const formatErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  const keywordUris = [
    "https://json-schema.org/keyword/draft-2020-12/format",
    "https://json-schema.org/keyword/draft-2020-12/format-assertion",
    "https://json-schema.org/keyword/draft-2019-09/format",
    "https://json-schema.org/keyword/draft-2019-09/format-assertion",
    "https://json-schema.org/keyword/draft-07/format",
    "https://json-schema.org/keyword/draft-06/format",
    "https://json-schema.org/keyword/draft-04/format"
  ];
  for (const keywordUri of keywordUris) {
    for (const schemaLocation in normalizedErrors[keywordUri]) {
      if (normalizedErrors[keywordUri][schemaLocation]) {
        continue;
      }

      const keyword = await getSchema(schemaLocation);
      const format = /** @type string */ (Schema.value(keyword));

      errors.push({
        message: localization.getFormatErrorMessage(format),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }
  }

  return errors;
};

export default formatErrorHandler;
