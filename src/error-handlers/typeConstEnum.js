import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, Json } from "../index.d.ts"
 */

const ALL_TYPES = new Set(["null", "boolean", "number", "string", "array", "object", "integer"]);

/** @type {ErrorHandler} */
const typeConstEnumErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    let allowedTypes = new Set(ALL_TYPES);
    /** @type {string[]} */
    const failedTypeLocations = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/type"]) {
      if (normalizedErrors["https://json-schema.org/keyword/type"][schemaLocation].valid === false) {
        failedTypeLocations.push(schemaLocation);

        /** @type {string | string[]} */
        const value = /** @type {string | string[]} */ (normalizedErrors["https://json-schema.org/keyword/type"][schemaLocation].value);
        const types = Array.isArray(value) ? value : [value];
        /** @type {Set<string>} */
        const keywordTypes = new Set(types);
        if (keywordTypes.has("number")) {
          keywordTypes.add("integer");
        }
        allowedTypes = allowedTypes.intersection(keywordTypes);
      }
    }
    if (allowedTypes.has("number")) {
      allowedTypes.delete("integer");
    }

    /** @type {Set<string> | undefined} */
    let allowedJson;

    /** @type {string[]} */
    const constEnumLocations = [];
    /** @type {string[]} */
    const failedConstLocations = [];
    /** @type {string[]} */
    const failedEnumLocations = [];
    let typeFiltered = false;

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/const"]) {
      constEnumLocations.push(schemaLocation);
      if (normalizedErrors["https://json-schema.org/keyword/const"][schemaLocation].valid === false) {
        failedConstLocations.push(schemaLocation);
      }

      const keywordJson = new Set();
      const constValueJson = /** @type string */ (normalizedErrors["https://json-schema.org/keyword/const"][schemaLocation].value);
      if (isAllowedType(constValueJson, allowedTypes)) {
        keywordJson.add(constValueJson);
      } else {
        typeFiltered = true;
      }

      allowedJson = allowedJson?.intersection(keywordJson) ?? keywordJson;
    }

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/enum"]) {
      constEnumLocations.push(schemaLocation);
      if (normalizedErrors["https://json-schema.org/keyword/enum"][schemaLocation].valid === false) {
        failedEnumLocations.push(schemaLocation);
      }

      const keywordJson = new Set();
      const enumValuesJson = /** @type string[] */ (normalizedErrors["https://json-schema.org/keyword/enum"][schemaLocation].value);
      for (const enumValueJson of enumValuesJson) {
        if (isAllowedType(enumValueJson, allowedTypes)) {
          keywordJson.add(enumValueJson);
        } else {
          typeFiltered = true;
        }
      }

      allowedJson = allowedJson?.intersection(keywordJson) ?? keywordJson;
    }

    const failedLocations = failedConstLocations.length > 0
      ? failedConstLocations
      : failedEnumLocations;

    if (failedLocations.length === 0 && failedTypeLocations.length === 0) {
      return [];
    } else if (allowedTypes.size === 0 || allowedJson?.size === 0) {
      return [{
        message: context.localization.getBooleanSchemaErrorMessage(),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [...failedTypeLocations, ...constEnumLocations]
      }];
    } else if (allowedJson?.size) {
      /** @type Json[] */
      const allowedValues = [...allowedJson ?? []].map((json) => JSON.parse(json));

      return [{
        message: context.localization.getEnumErrorMessage(allowedValues),
        instanceLocation: Instance.uri(instance),
        schemaLocations: typeFiltered
          ? [...failedTypeLocations, ...constEnumLocations]
          : failedLocations
      }];
    } else {
      return [{
        message: context.localization.getTypeErrorMessage([...allowedTypes]),
        instanceLocation: Instance.uri(instance),
        schemaLocations: failedTypeLocations
      }];
    }
  },

  success: (normalizedOutput, instance, context) => {
    return [
      ...describeKeyword(normalizedOutput, "https://json-schema.org/keyword/type", instance, (/** @type string | string[] */ type) => {
        return context.localization.getTypeSuccessMessage(Array.isArray(type) ? type : [type]);
      }),
      ...describeKeyword(normalizedOutput, "https://json-schema.org/keyword/const", instance, (/** @type string */ constJson) => {
        return context.localization.getEnumSuccessMessage([JSON.parse(constJson)]);
      }),
      ...describeKeyword(normalizedOutput, "https://json-schema.org/keyword/enum", instance, (/** @type string[] */ enumJson) => {
        return context.localization.getEnumSuccessMessage(enumJson.map((json) => JSON.parse(json)));
      })
    ];
  }
};

/** @type (json: string, allowedTypes: Set<string>) => boolean */
const isAllowedType = (json, allowedTypes) => {
  const type = jsonTypeOf(json);
  return allowedTypes.has(type)
    || (type === "number" && allowedTypes.has("integer") && Number.isInteger(JSON.parse(json)));
};

/**
 * @param {string} value
 * @returns {string}
 */
const jsonTypeOf = (value) => {
  const firstChar = value[0];
  if (firstChar === "n") {
    return "null";
  } else if (firstChar === "[") {
    return "array";
  } else if ((firstChar >= "0" && firstChar <= "9") || firstChar === "-") {
    return "number";
  } else if (firstChar === "{") {
    return "object";
  } else if (firstChar === "\"") {
    return "string";
  } else {
    return "boolean";
  }
};

export default typeConstEnumErrorHandler;
