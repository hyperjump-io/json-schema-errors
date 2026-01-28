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
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const gcd = (a, b) => {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return Math.abs(a);
};

/**
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const lcm = (a, b) => {
  return Math.abs(a * b) / gcd(a, b);
};

export default multipleOfErrorHandler;
