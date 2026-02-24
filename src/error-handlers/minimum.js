import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minimumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let highestMinimum = -Infinity;
  let effectiveMinimumSchemaLocation = "";
  let highestExclusiveMinimum = -Infinity;
  let effectiveExclusiveMinimumSchemaLocation = "";
  let effectiveDraft04ExclusiveLocation = "";

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minimum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minimum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const minimum = /** @type number */ (Schema.value(keyword));

    if (minimum > highestMinimum) {
      highestMinimum = minimum;
      effectiveMinimumSchemaLocation = schemaLocation;
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMinimum"]) {
    if (
      normalizedErrors["https://json-schema.org/keyword/exclusiveMinimum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const exclusiveMinimum = /** @type number */ (Schema.value(keyword));

    if (exclusiveMinimum > highestExclusiveMinimum) {
      highestExclusiveMinimum = exclusiveMinimum;
      effectiveExclusiveMinimumSchemaLocation = schemaLocation;
    }
  }
  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"][schemaLocation]) {
      continue;
    }

    const parentLocation = pointerPop(schemaLocation);

    let exclusive = false;
    let currentExclusiveLocation = "";
    for (const exclusiveLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/exclusiveMinimum"]) {
      const exclusiveParentLocation = pointerPop(exclusiveLocation);
      if (exclusiveParentLocation === parentLocation) {
        const exclusiveNode = await getSchema(exclusiveLocation);
        exclusive = /** @type boolean */ (Schema.value(exclusiveNode));
        currentExclusiveLocation = exclusiveLocation;
        break;
      }
    }

    const keywordNode = await getSchema(schemaLocation);
    const minimum = /** @type number */ (Schema.value(keywordNode));
    if (exclusive) {
      if (minimum > highestExclusiveMinimum) {
        highestExclusiveMinimum = minimum;
        effectiveExclusiveMinimumSchemaLocation = schemaLocation;
        effectiveDraft04ExclusiveLocation = currentExclusiveLocation;
      }
    } else {
      if (minimum > highestMinimum) {
        highestMinimum = minimum;
        effectiveMinimumSchemaLocation = schemaLocation;
      }
    }
  }

  if (highestMinimum === -Infinity && highestExclusiveMinimum === -Infinity) {
    return [];
  }
  if (highestExclusiveMinimum >= highestMinimum) {
    const schemaLocations = [effectiveExclusiveMinimumSchemaLocation];
    if (effectiveDraft04ExclusiveLocation) {
      schemaLocations.push(effectiveDraft04ExclusiveLocation);
    }
    errors.push({
      message: localization.getExclusiveMinimumErrorMessage(highestExclusiveMinimum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: schemaLocations
    });
  } else {
    errors.push({
      message: localization.getMinimumErrorMessage(highestMinimum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [effectiveMinimumSchemaLocation]
    });
  }

  return errors;
};
/** @type (pointer: string) => string */
const pointerPop = (pointer) => pointer.replace(/\/[^/]+$/, "");

export default minimumErrorHandler;
