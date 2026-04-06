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

    const instanceProps = Pact.pipe(
      Instance.keys(instance),
      Pact.map((keyNode) => JsonPointer.append(/** @type {string} */ (Instance.value(keyNode)), instanceLocation)),
      Pact.collectSet
    );

    const discriminators = Pact.pipe(
      instanceProps,
      Pact.filter((propLocation) => Pact.some((alternative) => propertyPasses(alternative[propLocation]), oneOf)),
      Pact.collectSet
    );

    filtered = [];
    for (const alternative of oneOf) {
      const typeResults = alternative[instanceLocation]?.["https://json-schema.org/keyword/type"];
      if (typeResults && !Object.values(typeResults).every((isValid) => isValid)) {
        continue;
      }

      if (Instance.typeOf(instance) === "object") {
        const declaredProps = Pact.pipe(
          Object.keys(alternative),
          Pact.filter((loc) => instanceProps.has(loc)),
          Pact.collectSet
        );

        if (!declaredProps.size) {
          continue;
        }

        if (Pact.some((propLocation) => !propertyPasses(alternative[propLocation]), discriminators)) {
          continue;
        }
      }

      filtered.push(alternative);
    }

    if (filtered.length === 0) {
      filtered = oneOf;
    }

    /** @type ErrorObject[][] */
    const alternatives = [];

    if (alternatives.length === 0) {
      for (const alternative of filtered) {
        const alternativeErrors = await getErrors(alternative, instance, localization);
        if (alternativeErrors.length) {
          alternatives.push(alternativeErrors);
        }
      }
    }

    if (alternatives.length === 1) {
      errors.push(...alternatives[0]);
    } else {
      /** @type ErrorObject */
      const error = {
        message: localization.getOneOfErrorMessage(0),
        instanceLocation,
        schemaLocations: [schemaLocation]
      };
      if (alternatives.length) {
        error.alternatives = alternatives;
      }
      errors.push(error);
    }
  }

  return errors;
};

/** @type (propOutput: NormalizedOutput[string] | undefined) => boolean */
const propertyPasses = (propOutput) => {
  if (!propOutput) {
    return false;
  }
  return Object.values(propOutput).every((keywordResults) => Object.values(keywordResults).every((v) => v === true));
};

export default oneOfErrorHandler;
