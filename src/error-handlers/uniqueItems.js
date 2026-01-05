import * as Instance from "@hyperjump/json-schema/instance/experimental";
import jsonStringify from "json-stringify-deterministic";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
// eslint-disable-next-line @typescript-eslint/require-await
const uniqueItemsErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/uniqueItems"]) {
    if (normalizedErrors["https://json-schema.org/keyword/uniqueItems"][schemaLocation]) {
      continue;
    }

    /** @type Record<string, { instanceLocations: string[], count: number }> */
    const itemCounts = {};
    for (const item of Instance.iter(instance)) {
      const key = jsonStringify(Instance.value(item));
      itemCounts[key] ??= { instanceLocations: [], count: 0 };
      itemCounts[key].instanceLocations.push(Instance.uri(item));
      itemCounts[key].count++;
    }

    for (const key in itemCounts) {
      if (itemCounts[key].count > 1) {
        for (const instanceLocation of itemCounts[key].instanceLocations) {
          errors.push({
            message: localization.getUniqueItemsErrorMessage(),
            instanceLocation: instanceLocation,
            schemaLocations: [schemaLocation]
          });
        }
      }
    }
  }

  return errors;
};

export default uniqueItemsErrorHandler;
