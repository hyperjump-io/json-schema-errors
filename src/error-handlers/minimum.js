import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler } from "../index.d.ts"
 */

/** @type ErrorHandler */
const minimumErrorHandler = (normalizedErrors, instance, localization, resolver) => {
  if (!resolver?.getCompiledKeywordValue || !resolver.getSiblingKeywordValue) {
    throw new Error("Missing resolver functions in error handler context");
  }

  let highestMinimum = -Infinity;
  let isExclusive = false;
  /** @type string[] */
  let schemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/minimum"]) {
    if (normalizedErrors["https://json-schema.org/keyword/minimum"][schemaLocation]) {
      continue;
    }

    const minimum = /** @type number */ (resolver.getCompiledKeywordValue(schemaLocation));

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

    const exclusiveMinimum = /** @type number */ (resolver.getCompiledKeywordValue(schemaLocation));

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

    const draft04Minimum = /** @type [number, boolean] */ (resolver.getCompiledKeywordValue(schemaLocation));
    const minimum = draft04Minimum[0];
    const exclusive = draft04Minimum[1];
    const exclusiveKeyword = resolver.getSiblingKeywordValue(schemaLocation, "https://json-schema.org/keyword/draft-04/exclusiveMinimum");
    const exclusiveLocation = exclusive && exclusiveKeyword ? exclusiveKeyword.keywordLocation : "";
    if (minimum > highestMinimum) {
      highestMinimum = minimum;
      isExclusive = exclusive;
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

export default minimumErrorHandler;
