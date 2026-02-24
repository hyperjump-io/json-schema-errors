import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minimumErrorHandler = async (normalizedErrors, instance, localization) => {
  let highestMinimum = -Infinity;
  let isExclusive = false;
  /** @type string[] */
  let schemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minimum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minimum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const minimum = /** @type number */ (Schema.value(keyword));

    if (minimum > highestMinimum) {
      highestMinimum = minimum;
      schemaLocations = [schemaLocation];
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMinimum"]) {
    if (
      normalizedErrors["https://json-schema.org/keyword/exclusiveMinimum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const exclusiveMinimum = /** @type number */ (Schema.value(keyword));

    if (exclusiveMinimum > highestMinimum) {
      highestMinimum = exclusiveMinimum;
      isExclusive = true;
      schemaLocations = [schemaLocation];
    }
  }
  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/minimum"][schemaLocation]) {
      continue;
    }

    const parentLocation = pointerPop(schemaLocation);

    let exclusiveLocation = "";
    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/exclusiveMinimum"]) {
      const exclusiveParentLocation = pointerPop(schemaLocation);
      if (exclusiveParentLocation === parentLocation) {
        const exclusiveNode = await getSchema(schemaLocation);
        if (Schema.value(exclusiveNode)) {
          exclusiveLocation = schemaLocation;
        }
        break;
      }
    }

    const keywordNode = await getSchema(schemaLocation);
    const minimum = /** @type number */ (Schema.value(keywordNode));
    if (minimum > highestMinimum) {
      highestMinimum = minimum;
      isExclusive = !!exclusiveLocation;
      schemaLocations = exclusiveLocation ? [schemaLocation, exclusiveLocation] : [schemaLocation];
    }
  }

  if (highestMinimum === -Infinity) {
    return [];
  } else if (isExclusive) {
    return [{
      message: localization.getExclusiveMinimumErrorMessage(highestMinimum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: schemaLocations
    }];
  } else {
    return [{
      message: localization.getMinimumErrorMessage(highestMinimum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: schemaLocations
    }];
  }
};

/** @type (pointer: string) => string */
const pointerPop = (pointer) => pointer.replace(/\/[^/]+$/, "");

export default minimumErrorHandler;
