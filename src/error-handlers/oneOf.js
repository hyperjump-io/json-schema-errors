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
const oneOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors[
    "https://json-schema.org/keyword/oneOf"
  ]) {
    const oneOf
      = normalizedErrors["https://json-schema.org/keyword/oneOf"][schemaLocation];
    if (typeof oneOf === "boolean") {
      continue;
    }

    const instanceLocation = Instance.uri(instance);

    let matchCount = 0;
    /** @type ErrorObject[][] */
    const failingAlternatives = [];

    for (const alternative of oneOf) {
      const alternativeErrors = await getErrors(
        alternative,
        instance,
        localization
      );
      if (alternativeErrors.length) {
        failingAlternatives.push(alternativeErrors);
      } else {
        matchCount++;
      }
    }

    if (matchCount > 1) {
      /** @type ErrorObject */
      const error = {
        message: localization.getOneOfErrorMessage(matchCount),
        instanceLocation,
        schemaLocations: [schemaLocation]
      };
      if (failingAlternatives.length) {
        error.alternatives = failingAlternatives;
      }
      errors.push(error);
      continue;
    }

    let filtered = oneOf;

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
        filtered = oneOf;
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
        filtered = oneOf;
      }
    }

    const alternatives = [];
    for (const alternative of filtered) {
      const alternativeErrors = await getErrors(
        alternative,
        instance,
        localization
      );
      if (alternativeErrors.length) {
        alternatives.push(alternativeErrors);
      }
    }

    if (alternatives.length === 1) {
      errors.push(...alternatives[0]);
    } else {
      /** @type ErrorObject */
      const alternativeErrors = {
        message: localization.getOneOfErrorMessage(0),
        instanceLocation,
        schemaLocations: [schemaLocation]
      };
      if (alternatives.length) {
        alternativeErrors.alternatives = alternatives;
      }
      errors.push(alternativeErrors);
    }
  }

  return errors;
};

export default oneOfErrorHandler;
