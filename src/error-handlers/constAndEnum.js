import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import jsonStringify from "json-stringify-deterministic";

/**
 * @import { ErrorHandler, ErrorObject, Json } from "../index.d.ts"
 */

/**
 * @typedef {{
 *   allowedValues: Json[];
 *   schemaLocation: string;
 * }} Constraint
 */

/** @type {ErrorHandler} */
const constAndEnumErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type {ErrorObject[]} */
  const errors = [];

  /** @type {Constraint[]} */
  const constraints = [];
  let hasFailure = false;

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/const"]) {
    const passed = normalizedErrors["https://json-schema.org/keyword/const"][schemaLocation] === true;
    if (!passed) {
      hasFailure = true;
    }
    const keyword = await getSchema(schemaLocation);
    constraints.push({
      allowedValues: [Schema.value(keyword)],
      schemaLocation
    });
  }

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/enum"]) {
    const passed = normalizedErrors["https://json-schema.org/keyword/enum"][schemaLocation] === true;
    if (!passed) {
      hasFailure = true;
    }
    const keyword = await getSchema(schemaLocation);
    constraints.push({
      allowedValues: Schema.value(keyword),
      schemaLocation
    });
  }

  if (!hasFailure || constraints.length === 0) {
    return errors;
  }

  let intersectionKeys = new Set(constraints[0].allowedValues.map(toKey));
  for (let i = 1; i < constraints.length; i++) {
    intersectionKeys = intersectionKeys.intersection(new Set(constraints[i].allowedValues.map(toKey)));
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const intersection = /** @type {Json[]} */ ([...intersectionKeys].map((k) => JSON.parse(k)));

  const instanceLocation = Instance.uri(instance);
  const intersectionKeysArray = [...intersectionKeys];
  const exactMatch = constraints.find((c) => {
    if (c.allowedValues.length !== intersection.length) return false;
    const constraintKeys = new Set(c.allowedValues.map(toKey));
    return intersectionKeysArray.every((k) => constraintKeys.has(k));
  });

  if (intersection.length === 0) {
    errors.push({
      message: localization.getBooleanSchemaErrorMessage(),
      instanceLocation,
      schemaLocations: constraints.map((c) => c.schemaLocation)
    });
  } else if (intersection.length === 1) {
    errors.push({
      message: localization.getConstErrorMessage(intersection[0]),
      instanceLocation,
      schemaLocations: exactMatch ? [exactMatch.schemaLocation] : constraints.map((c) => c.schemaLocation)
    });
  } else {
    errors.push({
      message: localization.getEnumErrorMessage(intersection),
      instanceLocation,
      schemaLocations: exactMatch ? [exactMatch.schemaLocation] : constraints.map((c) => c.schemaLocation)
    });
  }
  return errors;
};

/**
 * @param {Json} val
 * @returns {string}
 */
const toKey = (val) => jsonStringify(val);

export default constAndEnumErrorHandler;
