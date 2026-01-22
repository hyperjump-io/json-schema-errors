import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../../index.d.ts"
 */

/** @type ErrorHandler */
const maximumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"][schemaLocation]) {
      continue;
    }

    const compiled = await getSchema(schemaLocation);
    const maximum = /** @type number */ (Schema.value(compiled));

    const parentLocation = schemaLocation.replace(/\/[^/]+$/, "");

    let exclusive = false;
    for (const exclusiveLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/exclusiveMaximum"]) {
      const exclusiveParentLocation = exclusiveLocation.replace(/\/[^/]+$/, "");
      if (exclusiveParentLocation === parentLocation) {
        const exclusiveCompiled = await getSchema(exclusiveLocation);
        exclusive = /** @type boolean */ (Schema.value(exclusiveCompiled));
        break;
      }
    }

    if (exclusive) {
      errors.push({
        message: localization.getExclusiveMaximumErrorMessage(maximum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    } else {
      errors.push({
        message: localization.getMaximumErrorMessage(maximum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }
  }

  return errors;
};

export default maximumErrorHandler;
