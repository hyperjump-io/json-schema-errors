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

    const schemaLocations = [schemaLocation];
    const parentLocation = pointerPop(schemaLocation);

    let exclusive = false;
    for (const exclusiveLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/exclusiveMaximum"]) {
      if (pointerPop(exclusiveLocation) === parentLocation) {
        schemaLocations.push(exclusiveLocation);
        const exclusiveNode = await getSchema(exclusiveLocation);
        exclusive = /** @type boolean */ (Schema.value(exclusiveNode));
        break;
      }
    }

    const keywordNode = await getSchema(schemaLocation);
    const maximum = /** @type number */ (Schema.value(keywordNode));

    if (exclusive) {
      errors.push({
        message: localization.getExclusiveMaximumErrorMessage(maximum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: schemaLocations
      });
    } else {
      errors.push({
        message: localization.getMaximumErrorMessage(maximum),
        instanceLocation: Instance.uri(instance),
        schemaLocations: schemaLocations
      });
    }
  }

  return errors;
};

/** @type (pointer: string) => string */
const pointerPop = (pointer) => pointer.replace(/\/[^/]+$/, "");

export default maximumErrorHandler;
