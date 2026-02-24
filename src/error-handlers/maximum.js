import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.js"
 */

/** @type ErrorHandler */
const maximumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  let lowestMaximum = Infinity;
  let effectiveMaximumSchemaLocation = "";
  let lowestExclusiveMaximum = Infinity;
  let effectiveExclusiveMaximumSchemaLocation = "";
  let effectiveDraft04ExclusiveLocation = "";

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maximum"][schemaLocation]) {
      continue;
    }
    const keyword = await getSchema(schemaLocation);
    const maximum = /** @type number */ (Schema.value(keyword));
    if (maximum < lowestMaximum) {
      lowestMaximum = maximum;
      effectiveMaximumSchemaLocation = schemaLocation;
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"][schemaLocation]) {
      continue;
    }
    const keyword = await getSchema(schemaLocation);
    const exclusiveMaximum = /** @type number */ (Schema.value(keyword));
    if (exclusiveMaximum < lowestExclusiveMaximum) {
      lowestExclusiveMaximum = exclusiveMaximum;
      effectiveExclusiveMaximumSchemaLocation = schemaLocation;
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/draft-04/maximum"][schemaLocation]) {
      continue;
    }

    const parentLocation = pointerPop(schemaLocation);
    let exclusive = false;
    let currentExclusiveLocation = "";
    for (const exclusiveLocation in normalizedErrors["https://json-schema.org/keyword/draft-04/exclusiveMaximum"]) {
      const exclusiveParentLocation = pointerPop(exclusiveLocation);
      if (exclusiveParentLocation === parentLocation) {
        const exclusiveNode = await getSchema(exclusiveLocation);
        exclusive = /** @type boolean */ (Schema.value(exclusiveNode));
        currentExclusiveLocation = exclusiveLocation;
        break;
      }
    }

    const keywordNode = await getSchema(schemaLocation);
    const maximum = /** @type number */ (Schema.value(keywordNode));

    if (exclusive) {
      if (maximum < lowestExclusiveMaximum) {
        lowestExclusiveMaximum = maximum;
        effectiveExclusiveMaximumSchemaLocation = schemaLocation;
        effectiveDraft04ExclusiveLocation = currentExclusiveLocation;
      }
    } else {
      if (maximum < lowestMaximum) {
        lowestMaximum = maximum;
        effectiveMaximumSchemaLocation = schemaLocation;
      }
    }
  }

  if (lowestMaximum === Infinity && lowestExclusiveMaximum === Infinity) {
    return errors;
  }

  if (lowestExclusiveMaximum <= lowestMaximum) {
    const schemaLocations = [effectiveExclusiveMaximumSchemaLocation];
    if (effectiveDraft04ExclusiveLocation) {
      schemaLocations.push(effectiveDraft04ExclusiveLocation);
    }
    errors.push({
      message: localization.getExclusiveMaximumErrorMessage(lowestExclusiveMaximum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: schemaLocations
    });
  } else {
    errors.push({
      message: localization.getMaximumErrorMessage(lowestMaximum),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [effectiveMaximumSchemaLocation]
    });
  }

  return errors;
};

/** @type (pointer: string) => string */
const pointerPop = (pointer) => pointer.replace(/\/[^/]+$/, "");

export default maximumErrorHandler;
