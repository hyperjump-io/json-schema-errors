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

    if (errors.length === 0 || multiples.length === 1) {
      return errors;
    }

    const combinedMultipleOf = lcm(multiples);
    // If the LCM can't be computed exactly, describe the original failing
    // constraints instead.
    if (combinedMultipleOf === null) {
      return errors;
    }

    return [{
      message: context.localization.getMultipleOfErrorMessage(combinedMultipleOf),
      instanceLocation: Instance.uri(instance),
      schemaLocations
    }];
  },

  success: (normalizedOutput, instance, context) => {
    return describeKeyword(normalizedOutput, "https://json-schema.org/keyword/multipleOf", instance, (/** @type number */ multipleOf) => {
      return context.localization.getMultipleOfSuccessMessage(multipleOf);
    });
  }
};

/** @type (value: number) => number */
const countDecimals = (value) => {
  const [mantissa, exponent = "0"] = value.toString().split("e");
  return Math.max((mantissa.split(".")[1]?.length ?? 0) - Number(exponent), 0);
};

/** @type (a: number, b: number) => number */
const gcd = (a, b) => b === 0 ? Math.abs(a) : gcd(b, a % b);

/** @type (multiples: number[]) => number | null */
const lcm = (multiples) => {
  const m = 10 ** Math.max(...multiples.map(countDecimals));
  let combined = 1;
  for (const multiple of multiples) {
    const integer = Math.round(multiple * m);
    if (!Number.isSafeInteger(integer)) {
      return null;
    }

    combined = Math.abs(combined / gcd(combined, integer) * integer);
    if (!Number.isSafeInteger(combined)) {
      return null;
    }
  }

  return combined / m;
};

export default multipleOfErrorHandler;
