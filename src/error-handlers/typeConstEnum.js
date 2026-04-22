import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, Json } from "../index.d.ts"
 */

const ALL_TYPES = new Set(["null", "boolean", "number", "string", "array", "object", "integer"]);

/** @type {ErrorHandler} */
const typeConstEnumErrorHandler = (normalizedErrors, instance, localization, ast) => {
  let allowedTypes = new Set(ALL_TYPES);
  /** @type {string[]} */
  const failedTypeLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/type"]) {
    if (!normalizedErrors["https://json-schema.org/keyword/type"][schemaLocation]) {
      failedTypeLocations.push(schemaLocation);

      /** @type {string | string[]} */
      const value = /** @type {string | string[]} */ (getCompiledKeywordValue(ast, schemaLocation));
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
    if (!normalizedErrors["https://json-schema.org/keyword/const"][schemaLocation]) {
      failedConstLocations.push(schemaLocation);
    }

    const keywordJson = new Set();
    const constValueJson = /** @type string */ (getCompiledKeywordValue(ast, schemaLocation));
    if (allowedTypes.has(jsonTypeOf(constValueJson))) {
      keywordJson.add(constValueJson);
    } else {
      typeFiltered = true;
    }

    allowedJson = allowedJson?.intersection(keywordJson) ?? keywordJson;
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/enum"]) {
    constEnumLocations.push(schemaLocation);
    if (!normalizedErrors["https://json-schema.org/keyword/enum"][schemaLocation]) {
      failedEnumLocations.push(schemaLocation);
    }

    const keywordJson = new Set();
    const enumValuesJson = /** @type string[] */ (getCompiledKeywordValue(ast, schemaLocation));
    for (const enumValueJson of enumValuesJson) {
      if (allowedTypes.has(jsonTypeOf(enumValueJson))) {
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
      message: localization.getBooleanSchemaErrorMessage(),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [...failedTypeLocations, ...constEnumLocations]
    }];
  } else if (allowedJson?.size) {
    /** @type Json[] */
    const allowedValues = [...allowedJson ?? []].map((json) => JSON.parse(json));

    return [{
      message: localization.getEnumErrorMessage(allowedValues),
      instanceLocation: Instance.uri(instance),
      schemaLocations: typeFiltered
        ? [...failedTypeLocations, ...constEnumLocations]
        : failedLocations
    }];
  } else {
    return [{
      message: localization.getTypeErrorMessage([...allowedTypes]),
      instanceLocation: Instance.uri(instance),
      schemaLocations: failedTypeLocations
    }];
  }
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
