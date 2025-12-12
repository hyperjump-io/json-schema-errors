import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

const ALL_TYPES = new Set(["null", "boolean", "number", "string", "array", "object", "integer"]);

/** @type ErrorHandler */
const type = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  if (normalizedErrors["https://json-schema.org/keyword/type"]) {
    let allowedTypes = ALL_TYPES;
    const failedTypeLocations = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/type"]) {
      const isValid = normalizedErrors["https://json-schema.org/keyword/type"][schemaLocation];
      if (!isValid) {
        failedTypeLocations.push(schemaLocation);
      }

      const keyword = await getSchema(schemaLocation);
      /** @type {string|string[]} */
      const value = Schema.value(keyword);
      const types = Array.isArray(value) ? value : [value];
      /** @type {Set<string>} */
      const keywordTypes = new Set(types);
      if (keywordTypes.has("number")) {
        keywordTypes.add("integer");
      }
      allowedTypes = allowedTypes.intersection(keywordTypes);
    }
    if (allowedTypes.has("number")) {
      allowedTypes.delete("integer");
    }

    if (allowedTypes.size === 0) {
      errors.push({
        message: localization.getConflictingTypeMessage(),
        instanceLocation: Instance.uri(instance),
        schemaLocation: failedTypeLocations
      });
    } else if (failedTypeLocations.length > 0) {
      errors.push({
        message: localization.getTypeErrorMessage([...allowedTypes], Instance.typeOf(instance)),
        instanceLocation: Instance.uri(instance),
        schemaLocation: failedTypeLocations.length === 1 ? failedTypeLocations[0] : failedTypeLocations
      });
    }
  }

  return errors;
};

export default type;
