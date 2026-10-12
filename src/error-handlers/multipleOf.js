import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { describeKeyword } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const multipleOfErrorHandler = {
  error: (normalizedErrors, instance, context) => {
    /** @type ErrorObject[] */
    const errors = [];

    /** @type number[] */
    const multiples = [];
    /** @type string[] */
    const schemaLocations = [];

    for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/multipleOf"]) {
      const multipleOf = /** @type number */ (normalizedErrors["https://json-schema.org/keyword/multipleOf"][schemaLocation].value);
      if (normalizedErrors["https://json-schema.org/keyword/multipleOf"][schemaLocation].valid === false) {
        errors.push({
          message: context.localization.getMultipleOfErrorMessage(multipleOf),
          instanceLocation: Instance.uri(instance),
          schemaLocations: [schemaLocation]
        });
      }

      multiples.push(multipleOf);
      schemaLocations.push(schemaLocation);
    }

    if (errors.length > 0) {
      const combinedMultipleOf = lcm(multiples);
      // If the exact LCM cannot be represented as a number, describe the
      // original failing constraints rather than a rounded or infinite multiple.
      if (combinedMultipleOf === null) {
        return errors;
      }

      return [{
        message: context.localization.getMultipleOfErrorMessage(combinedMultipleOf),
        instanceLocation: Instance.uri(instance),
        schemaLocations
      }];
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/multipleOf", instance, (/** @type number */ multipleOf) => {
      return context.localization.getMultipleOfSuccessMessage(multipleOf);
    });
  }
};

/**
 * @param {number} value
 * @returns {{ coefficient: bigint, exponent: number }}
 */
const toDecimal = (value) => {
  const [mantissa, exponent = "0"] = value.toString().split("e");
  const decimals = mantissa.split(".")[1]?.length ?? 0;
  return {
    coefficient: BigInt(mantissa.replace(".", "")),
    exponent: Number(exponent) - decimals
  };
};

/**
 * @param {bigint} x
 * @param {bigint} y
 * @returns {bigint}
 */
const gcd = (x, y) => {
  while (y !== 0n) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x;
};

/**
 * @param {number[]} multiples
 * @returns {number | null}
 */
const lcm = (multiples) => {
  // Use the decimal representations of the schema values. Keep a common scale
  // and exact integers throughout, including when combining three or more values.
  const decimals = multiples.map(toDecimal);
  const exponent = decimals.reduce((min, decimal) => Math.min(min, decimal.exponent), Infinity);
  let combined = 1n;
  for (const decimal of decimals) {
    const integer = decimal.coefficient * 10n ** BigInt(decimal.exponent - exponent);
    combined = (combined / gcd(combined, integer)) * integer;
  }

  const result = Number(`${combined}e${exponent}`);
  if (!Number.isFinite(result)) {
    return null;
  }

  // A finite result can still have lost significant digits during conversion.
  const rounded = toDecimal(result);
  const commonExponent = Math.min(exponent, rounded.exponent);
  return combined * 10n ** BigInt(exponent - commonExponent)
    === rounded.coefficient * 10n ** BigInt(rounded.exponent - commonExponent)
    ? result
    : null;
};

export default multipleOfErrorHandler;
