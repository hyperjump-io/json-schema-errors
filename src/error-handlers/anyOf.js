import * as Schema from "@hyperjump/browser";
import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getErrors } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
const anyOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/anyOf"]) {
    const anyOf = normalizedErrors["https://json-schema.org/keyword/anyOf"][schemaLocation];
    if (typeof anyOf === "boolean") {
      continue;
    }

    const alternatives = [];
    const instanceType = Instance.typeOf(instance);

    for (const [i, alternative] of anyOf.entries()) {
      let match = true;

      const anyOfSchema = await getSchema(schemaLocation);
      const alternativeSchema = await Schema.step(String(i), anyOfSchema);
      const typeSchema = await Schema.step("type", alternativeSchema);
      const type = /** @type {string | string[]} */ (Schema.value(typeSchema));

      if (typeof type === "string") {
        match = type === instanceType || (type === "integer" && instanceType === "number");
      } else if (Array.isArray(type)) {
        match = type.includes(instanceType) || (type.includes("integer") && instanceType === "number");
      }

      if (match) {
        alternatives.push(await getErrors(alternative, instance, localization));
      }
    }

    if (alternatives.length === 0) {
      for (const alternative of anyOf) {
        alternatives.push(await getErrors(alternative, instance, localization));
      }
    }

    if (alternatives.length === 1) {
      errors.push(...alternatives[0]);
    } else {
      errors.push({
        message: localization.getAnyOfErrorMessage(),
        alternatives: alternatives,
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }
  }

  return errors;
};

export default anyOfErrorHandler;
