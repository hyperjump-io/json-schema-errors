import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const typeErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/type"]) {
    if (normalizedErrors["https://json-schema.org/keyword/type"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const expectedTypes = /** @type string[] */ (Schema.typeOf(keyword) === "array"
      ? Schema.value(keyword)
      : [Schema.value(keyword)]);

    errors.push({
      message: localization.getTypeErrorMessage(expectedTypes),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    });
  }

  return errors;
};

export default typeErrorHandler;
