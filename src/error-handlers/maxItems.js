import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const maxItemsErrorHandler = (normalizedErrors, instance, localization, ast) => {
  /** @type ErrorObject[] */
  const errors = [];
  let lowestMaxItems = Infinity;
  let effectiveSchemaLocation = "";

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/maxItems"]) {
    if (normalizedErrors["https://json-schema.org/keyword/maxItems"][schemaLocation]) {
      continue;
    }

    const maxItems = /** @type number */ (getCompiledKeywordValue(ast, schemaLocation));

    if (maxItems < lowestMaxItems) {
      lowestMaxItems = maxItems;
      effectiveSchemaLocation = schemaLocation;
    }
  }

  if (lowestMaxItems != Infinity) {
    errors.push({
      message: localization.getMaxItemsErrorMessage(lowestMaxItems),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [effectiveSchemaLocation]
    });
  }

  return errors;
};

export default maxItemsErrorHandler;
