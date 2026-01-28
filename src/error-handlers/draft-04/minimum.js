import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../../index.d.ts"
 */

/** @type ErrorHandler */
const minimumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"][schemaLocation]) {
      continue;
    }

    const parentLocation = pointerPop(schemaLocation);

    let exclusive = false;
    for (const exclusiveLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/exclusiveMinimum"]) {
      const exclusiveParentLocation = pointerPop(exclusiveLocation);
      if (exclusiveParentLocation === parentLocation) {
        const exclusiveNode = await getSchema(exclusiveLocation);
        exclusive = /** @type boolean */ (Schema.value(exclusiveNode));
        break;
      }
    }

    const keywordNode = await getSchema(schemaLocation);
    const minimum = /** @type number */ (Schema.value(keywordNode));

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

/** @type (pointer: string) => string */
const pointerPop = (pointer) => pointer.replace(/\/[^/]+$/, "");

export default minimumErrorHandler;
