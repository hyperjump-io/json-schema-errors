import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maximumErrorHandler = async (normalizedErrors, instance, localization) => {
  let lowestMaximum = Infinity;
  let isExclusive = false;

  /** @type string[] */
  let schemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maximum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const maximum = /** @type number */ (Schema.value(keyword));
    if (maximum < lowestMaximum) {
      lowestMaximum = maximum;
      schemaLocations = [schemaLocation];
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const exclusiveMaximum = /** @type number */ (Schema.value(keyword));
    if (exclusiveMaximum < lowestMaximum) {
      lowestMaximum = exclusiveMaximum;
      isExclusive = true;
      schemaLocations = [schemaLocation];
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"][schemaLocation]) {
      continue;
    }

    const parentLocation = pointerPop(schemaLocation);
    /** @type string */
    let exclusiveLocation = "";
    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/exclusiveMaximum"]) {
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
    const maximum = /** @type number */ (Schema.value(keywordNode));

    if (maximum < lowestMaximum) {
      lowestMaximum = maximum;
      isExclusive = !!exclusiveLocation;
      schemaLocations = exclusiveLocation ? [schemaLocation, exclusiveLocation] : [schemaLocation];
    }
  }

  if (lowestMaximum === Infinity) {
    return [];
  } else if (isExclusive) {
    return [{
      message: localization.getExclusiveMaximumErrorMessage(lowestMaximum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: schemaLocations
    }];
  } else {
    return [{
      message: localization.getMaximumErrorMessage(lowestMaximum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: schemaLocations
    }];
  }
};

/** @type (pointer: string) => string */
const pointerPop = (pointer) => pointer.replace(/\/[^/]+$/, "");

export default maximumErrorHandler;
