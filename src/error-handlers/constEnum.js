import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import jsonStringify from "json-stringify-deterministic";

/**
 * @import { ErrorHandler, Json } from "../index.d.ts"
 */

/**
 * @typedef {{
 *   allowedValues: Json[];
 *   schemaLocation: string;
 * }} Constraint
 */

const ALL_TYPES = new Set(["null", "boolean", "number", "string", "array", "object", "integer"]);

/** @type {ErrorHandler} */
const constEnumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type Set<string> | undefined */
  let allowedJson;

  /** @type string[]> */
  const constSchemaLocations = [];

  /** @type string[]> */
  const enumSchemaLocations = [];

  /** @type string[]> */
  const allSchemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/const"]) {
    if (!normalizedErrors["https://json-schema.org/keyword/const"][schemaLocation]) {
      constSchemaLocations.push(schemaLocation);
    }
    allSchemaLocations.push(schemaLocation);

    const keyword = await getSchema(schemaLocation);
    const keywordJson = new Set([jsonStringify(/** @type Json */ (Schema.value(keyword)))]);

    allowedJson = allowedJson?.intersection(keywordJson) ?? keywordJson;
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/enum"]) {
    if (!normalizedErrors["https://json-schema.org/keyword/enum"][schemaLocation]) {
      enumSchemaLocations.push(schemaLocation);
    }
    allSchemaLocations.push(schemaLocation);

    const keyword = await getSchema(schemaLocation);
    const keywordJson = new Set(/** @type Json[] */ (Schema.value(keyword)).map((value) => jsonStringify(value)));

    allowedJson = allowedJson?.intersection(keywordJson) ?? keywordJson;
  }

  if (allSchemaLocations.length === 0) {
    return [];
  }

  if (normalizedErrors["https://json-schema.org/keyword/type"] && allowedJson) {
    let allowedTypes = ALL_TYPES;
    /** @type {string[]} */
    const typeLocations = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/type"]) {
      typeLocations.push(schemaLocation);
      const keyword = await getSchema(schemaLocation);
      /** @type {string | string[]} */
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

    /** @type {Set<string>} */
    const filteredJson = new Set();
    for (const jsonStr of allowedJson) {
      /** @type {Json} */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const val = JSON.parse(jsonStr);
      let valueType = val === null ? "null" : Array.isArray(val) ? "array" : typeof val;
      if (valueType === "object") {
        valueType = "object";
      }
      if (valueType === "number" && Number.isInteger(val)) {
        valueType = "integer";
      }

      if (allowedTypes.has(valueType)
        || (valueType === "integer" && allowedTypes.has("number"))) {
        filteredJson.add(jsonStr);
      }
    }

    if (filteredJson.size === 0) {
      if (constSchemaLocations.length === 0 && enumSchemaLocations.length === 0) {
        constSchemaLocations.push(...allSchemaLocations.filter((loc) =>
          !typeLocations.includes(loc)));
        enumSchemaLocations.push(...constSchemaLocations);
      }
      const constEnumLocations = allSchemaLocations.filter((loc) =>
        !typeLocations.includes(loc));
      allSchemaLocations.length = 0;
      allSchemaLocations.push(...typeLocations, ...constEnumLocations);
    } else {
      const instanceJson = jsonStringify(Instance.value(instance));
      if (!filteredJson.has(instanceJson)) {
        if (constSchemaLocations.length === 0 && enumSchemaLocations.length === 0) {
          constSchemaLocations.push(...allSchemaLocations.filter((loc) =>
            !typeLocations.includes(loc)));
          enumSchemaLocations.push(...constSchemaLocations);
        }
      }
    }

    allowedJson = filteredJson;
  }

  if (constSchemaLocations.length === 0 && enumSchemaLocations.length === 0) {
    return [];
  }

  if (allowedJson?.size === 0) {
    return [{
      message: localization.getBooleanSchemaErrorMessage(),
      instanceLocation: Instance.uri(instance),
      schemaLocations: allSchemaLocations
    }];
  } else {
    /** @type Json[] */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const allowedValues = [...allowedJson ?? []].map((json) => JSON.parse(json));

    return [{
      message: localization.getEnumErrorMessage(allowedValues),
      instanceLocation: Instance.uri(instance),
      schemaLocations: constSchemaLocations.length ? constSchemaLocations : enumSchemaLocations
    }];
  }
};

export default constEnumErrorHandler;
