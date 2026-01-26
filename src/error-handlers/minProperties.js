import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minPropertiesErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  let highestMinProperties = -Infinity;
  let mostConstrainingLocation = null;

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minProperties"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minProperties"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const minProperties = /** @type number */ (Schema.value(keyword));

    if (minProperties > highestMinProperties) {
      highestMinProperties = minProperties;
      mostConstrainingLocation = schemaLocation;
    }
  }

  if (mostConstrainingLocation !== null) {
    errors.push({
      message: localization.getMinPropertiesErrorMessage(highestMinProperties),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [mostConstrainingLocation]
    });
  }

  return errors;
};

export default minPropertiesErrorHandler;
