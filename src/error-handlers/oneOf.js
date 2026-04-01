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

    const isObject = Instance.typeOf(instance) === "object";
    const instanceProps = isObject
      ? Pact.collectSet(Pact.pipe(Instance.keys(instance), Pact.map((keyNode) => /** @type {string} */ (Instance.value(keyNode)))))
      : undefined;
    const prefix = `${instanceLocation}/`;

    filtered = [];
    for (const alternative of oneOf) {
      const typeResults = alternative[instanceLocation]?.["https://json-schema.org/keyword/type"];
      if (typeResults && !Object.values(typeResults).every((isValid) => isValid)) {
        continue;
      }

      if (isObject) {
        const declaredProps = Pact.collectSet(Pact.pipe(
          Object.keys(alternative),
          Pact.filter((loc) => loc.startsWith(prefix)),
          Pact.map((loc) => /** @type {string} */ (Pact.head(JsonPointer.pointerSegments(loc.slice(prefix.length - 1)))))
        ));

        if (declaredProps.size > 0 && !Pact.some((prop) => declaredProps.has(prop), /** @type {Set<string>} */ (instanceProps))) {
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

    if (isObject) {
      const discriminators = Pact.collectSet(
        /** @type {Iterable<string>} */ (Pact.pipe(
          filtered,
          Pact.map((alternative) => Pact.pipe(
            /** @type {Set<string>} */ (instanceProps),
            Pact.filter((prop) => propertyPasses(alternative[JsonPointer.append(prop, instanceLocation)]))
          )),
          Pact.flatten
        ))
      );

      for (const alternative of filtered) {
        if (!Pact.some((prop) => !propertyPasses(alternative[JsonPointer.append(prop, instanceLocation)]), discriminators)) {
          const alternativeErrors = await getErrors(alternative, instance, localization);
          if (alternativeErrors.length) {
            alternatives.push(alternativeErrors);
          }
        }
      }
    }

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
