import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";
import jsonStringify from "json-stringify-deterministic";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const uniqueItemsErrorHandler = {
  error: (normalizedErrors, instance, localization) => {
    /** @type ErrorObject[] */
    const errors = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/uniqueItems"]) {
      if (normalizedErrors["https://json-schema.org/keyword/uniqueItems"][schemaLocation].valid !== false) {
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
  },

  success: (normalizedOutput, instance, localization, ast) => {
    /** @type ErrorObject[] */
    const successes = [];

    for (const schemaLocation in normalizedOutput["https://json-schema.org/keyword/uniqueItems"]) {
      // 'uniqueItems: false' allows anything, so there's nothing to say
      if (getCompiledKeywordValue(ast, schemaLocation) !== true) {
        continue;
      }

      successes.push({
        message: localization.getUniqueItemsSuccessMessage(),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return successes;
  }
};

export default uniqueItemsErrorHandler;
