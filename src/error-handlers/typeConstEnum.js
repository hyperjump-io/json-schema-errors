import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import jsonStringify from "json-stringify-deterministic";

/**
 * @import { ErrorHandler, Json } from "../index.d.ts"
 */

const ALL_TYPES = new Set(["null", "boolean", "number", "string", "array", "object", "integer"]);

/** @type {ErrorHandler} */
const typeConstEnumErrorHandler = async (normalizedErrors, instance, localization) => {
  let allowedTypes = new Set(ALL_TYPES);
  /** @type {string[]} */
  const failedTypeLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/type"]) {
    if (!normalizedErrors["https://json-schema.org/keyword/type"][schemaLocation]) {
      failedTypeLocations.push(schemaLocation);

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

    const keyword = await getSchema(schemaLocation);
    const keywordJson = new Set();
    if (allowedTypes.has(Schema.typeOf(keyword))) {
      keywordJson.add(jsonStringify(Schema.value(keyword)));
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

    const keyword = await getSchema(schemaLocation);
    const keywordJson = new Set();
    for await (const enumValueNode of Schema.iter(keyword)) {
      if (allowedTypes.has(Schema.typeOf(enumValueNode))) {
        keywordJson.add(jsonStringify(Schema.value(enumValueNode)));
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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

export default typeConstEnumErrorHandler;
