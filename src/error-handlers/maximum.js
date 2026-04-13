import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maximumErrorHandler = (normalizedErrors, instance, localization, resolver) => {
  if (!resolver?.getCompiledKeywordValue || !resolver.getSiblingKeywordValue) {
    throw new Error("Missing resolver functions in error handler context");
  }

  let lowestMaximum = Infinity;
  let isExclusive = false;

  /** @type string[] */
  let schemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maximum"][schemaLocation]) {
      continue;
    }

    const maximum = /** @type number */ (resolver.getCompiledKeywordValue(schemaLocation));
    if (maximum < lowestMaximum) {
      lowestMaximum = maximum;
      schemaLocations = [schemaLocation];
    }
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/exclusiveMaximum"][schemaLocation]) {
      continue;
    }

    const exclusiveMaximum = /** @type number */ (resolver.getCompiledKeywordValue(schemaLocation));
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

    const draft04Maximum = /** @type [number, boolean] */ (resolver.getCompiledKeywordValue(schemaLocation));
    const maximum = draft04Maximum[0];
    const exclusive = draft04Maximum[1];
    const exclusiveKeyword = resolver.getSiblingKeywordValue(schemaLocation, "https://json-schema.org/keyword/draft-04/exclusiveMaximum");
    const exclusiveLocation = exclusive && exclusiveKeyword ? exclusiveKeyword.keywordLocation : "";

    if (maximum < lowestMaximum) {
      lowestMaximum = maximum;
      isExclusive = exclusive;
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

export default maximumErrorHandler;
