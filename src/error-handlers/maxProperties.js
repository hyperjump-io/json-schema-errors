import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxPropertiesErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let lowestMaxProperties = Infinity;
  let mostConstrainingLocation = null;
  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxProperties"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maxProperties"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const maxProperties = /** @type number */ (Schema.value(keyword));

    if (maxProperties < lowestMaxProperties) {
      lowestMaxProperties = maxProperties;
      mostConstrainingLocation = schemaLocation;
    }
  }
  if (mostConstrainingLocation !== null) {
    errors.push({
      message: localization.getMaxPropertiesErrorMessage(lowestMaxProperties),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [mostConstrainingLocation]
    });
  }

  return errors;
};

export default maxPropertiesErrorHandler;
