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
