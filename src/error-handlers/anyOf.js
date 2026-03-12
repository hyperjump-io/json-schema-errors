import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getErrors } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, NormalizedOutput } from "../index.d.ts"
 */

/** @type (alternative: NormalizedOutput, propLocation: string) => boolean */
const propertyPasses = (alternative, propLocation) => {
  const propOutput = alternative[propLocation];
  if (!propOutput || Object.keys(propOutput).length === 0) return false;
  return Object.values(propOutput).every((keywordResults) =>
    Object.values(keywordResults).every((v) => v === true)
  );
};

/** @type ErrorHandler */
const anyOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors[
    "https://json-schema.org/keyword/anyOf"
  ]) {
    const anyOf
      = normalizedErrors["https://json-schema.org/keyword/anyOf"][schemaLocation];
    if (typeof anyOf === "boolean") {
      continue;
    }
    const instanceLocation = Instance.uri(instance);
    let filtered = anyOf;

    if (Instance.typeOf(instance) === "object") {
      const instanceProps = new Set(
        [...Instance.keys(instance)].map(
          (keyNode) => /** @type {string} */ (Instance.value(keyNode))
        )
      );
      const prefix = `${instanceLocation}/`;

      filtered = filtered.filter((alternative) => {
        const declaredProps = Object.keys(alternative)
          .filter((loc) => loc.startsWith(prefix))
          .map((loc) => loc.slice(prefix.length));

        if (declaredProps.length === 0) return true;
        return declaredProps.some((prop) => instanceProps.has(prop));
      });

      filtered = filtered.filter((alternative) =>
        [...instanceProps].some((prop) =>
          propertyPasses(alternative, `${instanceLocation}/${prop}`)
        )
      );

      if (filtered.length === 0) {
        filtered = anyOf;
      }
    } else {
      filtered = filtered.filter((alternative) => {
        const typeResults
          = alternative[instanceLocation]?.[
            "https://json-schema.org/keyword/type"
          ];
        return (
          !typeResults || Object.values(typeResults).every((isValid) => isValid)
        );
      });

      if (filtered.length === 0) {
        filtered = anyOf;
      }
    }

    const alternatives = [];
    for (const alternative of filtered) {
      alternatives.push(await getErrors(alternative, instance, localization));
    }

    if (alternatives.length === 1) {
      errors.push(...alternatives[0]);
    } else {
      errors.push({
        message: localization.getAnyOfErrorMessage(),
        alternatives: alternatives,
        instanceLocation,
        schemaLocations: [schemaLocation]
      });
    }
  }

  return errors;
};

export default anyOfErrorHandler;
