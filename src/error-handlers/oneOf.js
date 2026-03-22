import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as JsonPointer from "@hyperjump/json-pointer";
import * as Pact from "@hyperjump/pact";
import { getErrors } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, NormalizedOutput } from "../index.d.ts"
 */

/** @type ErrorHandler */
const oneOfErrorHandler = async (normalizedErrors, instance, localization) => {
  /** @type ErrorObject[] */
  const errors = [];

  for (const schemaLocation in normalizedErrors["https://json-schema.org/keyword/oneOf"]) {
    const oneOf = normalizedErrors["https://json-schema.org/keyword/oneOf"][schemaLocation];
    if (typeof oneOf === "boolean") {
      continue;
    }

    const instanceLocation = Instance.uri(instance);

    let matchCount = 0;
    /** @type ErrorObject[][] */
    const failingAlternatives = [];

    for (const alternative of oneOf) {
      const alternativeErrors = await getErrors(alternative, instance, localization);
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
      const instanceProps = Pact.collectSet(
        Pact.map(
          (keyNode) => /** @type {string} */ (Instance.value(keyNode)),
          Instance.keys(instance)
        )
      );
      const prefix = `${instanceLocation}/`;

      filtered = [];
      for (const alternative of oneOf) {
        const typeResults = alternative[instanceLocation]?.["https://json-schema.org/keyword/type"];
        if (typeResults && !Object.values(typeResults).every((isValid) => isValid)) {
          continue;
        }

        const declaredProps = Object.keys(alternative)
          .filter((loc) => loc.startsWith(prefix))
          .map((loc) => /** @type {string} */ (Pact.head(JsonPointer.pointerSegments(loc.slice(prefix.length - 1)))));

        if (declaredProps.length > 0 && !declaredProps.some((prop) => instanceProps.has(prop))) {
          continue;
        }

        if (!Pact.some((prop) => propertyPasses(alternative[JsonPointer.append(prop, instanceLocation)]), instanceProps)) {
          continue;
        }

        filtered.push(alternative);
      }
    } else {
      filtered = [];
      for (const alternative of oneOf) {
        const typeResults = alternative[instanceLocation]["https://json-schema.org/keyword/type"];
        if (!typeResults || Object.values(typeResults).every((isValid) => isValid)) {
          filtered.push(alternative);
        }
      }
    }

    if (filtered.length === 0) {
      filtered = oneOf;
    }

    const alternatives = [];
    for (const alternative of filtered) {
      const alternativeErrors = await getErrors(alternative, instance, localization);
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

/** @type (propOutput: NormalizedOutput[string] | undefined) => boolean */
const propertyPasses = (propOutput) => {
  if (!propOutput || Object.keys(propOutput).length === 0) {
    return false;
  }
  return Object.values(propOutput).every((keywordResults) => Object.values(keywordResults).every((v) => v === true));
};

export default oneOfErrorHandler;
