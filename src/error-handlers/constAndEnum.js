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

/** @type {(a: Json, b: Json) => boolean} */
const jsonEqual = (a, b) => jsonStringify(a) === jsonStringify(b);

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

  const sorted = [...constraints].sort((a, b) =>
    a.allowedValues.length - b.allowedValues.length
  );
  const mostConstraining = sorted[0];

  let intersection = mostConstraining.allowedValues;
  for (let i = 1; i < sorted.length; i++) {
    intersection = intersection.filter((/** @type {Json} */ val) =>
      sorted[i].allowedValues.some((/** @type {Json} */ other) => jsonEqual(val, other))
    );
  }

  const instanceLocation = Instance.uri(instance);
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
      schemaLocations: [mostConstraining.schemaLocation]
    });
  } else {
    errors.push({
      message: localization.getEnumErrorMessage(intersection),
      instanceLocation,
      schemaLocations: [mostConstraining.schemaLocation]
    });
  }
  return errors;
};

export default constAndEnumErrorHandler;
