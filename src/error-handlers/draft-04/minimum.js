import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../../index.d.ts"
 * @import { Json } from "../../index.d.ts"
 */

/** @type ErrorHandler */
const minimumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"][schemaLocation]) {
      continue;
    }

    const compiled = await getSchema(schemaLocation);
    const minimum = /** @type number */ (Schema.value(compiled));

    const parentLocation = schemaLocation.replace(/\/minimum$/, "");
    const parent = await getSchema(parentLocation);
    const exclusiveNode = await Schema.step("exclusiveMinimum", parent);
    const exclusive = /** @type boolean */ (Schema.value(exclusiveNode) ?? false);

    if (exclusive) {
      errors.push({
        message: localization.getExclusiveMinimumErrorMessage(minimum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    } else {
      errors.push({
        message: localization.getMinimumErrorMessage(minimum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }
  }

  return errors;
};

export default minimumErrorHandler;
