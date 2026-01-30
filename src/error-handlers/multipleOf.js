import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const multipleOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  /** @type (number | null) */
  let combinedMultipleOf = null;
  /** @type string[] */
  const schemaLocations = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/multipleOf"]) {
    if (normalizedErrors["https://json-schema.org/keyword/multipleOf"][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const multipleOf = /** @type number */ (Schema.value(keyword));

    combinedMultipleOf = combinedMultipleOf === null ? multipleOf : lcm(combinedMultipleOf, multipleOf);
    schemaLocations.push(schemaLocation);
  }

  if (combinedMultipleOf !== null) {
    errors.push({
      message: localization.getMultipleOfErrorMessage(combinedMultipleOf),
      instanceLocation: Instance.uri(instance),
      schemaLocations
    });
  }

  return errors;
};

/**
 * @param {number} value
 * @returns {number}
 */
const countDecimals = (value) => value.toString().split(".")[1]?.length || 0;

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const gcd = (a, b) => {
  const m = 10 ** Math.max(countDecimals(a), countDecimals(b));
  let x = Math.round(a * m);
  let y = Math.round(b * m);

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return Math.abs(x) / m;
};

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const lcm = (a, b) => {
  const m = 10 ** Math.max(countDecimals(a), countDecimals(b));
  const x = Math.round(a * m);
  const y = Math.round(b * m);

  return Math.abs(x * y) / (gcd(x, y) * m);
};

export default multipleOfErrorHandler;
