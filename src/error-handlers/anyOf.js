import * as Instance from "@hyperjump/json-schema/instance/experimental";
import * as JsonPointer from "@hyperjump/json-pointer";
import * as Pact from "@hyperjump/pact";
import { getErrors } from "../json-schema-errors.js";

/**
 * @import { ErrorHandler, ErrorObject, NormalizedOutput } from "../index.d.ts"
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

    const instanceLocation = Instance.uri(instance);

    const instanceProps = Pact.pipe(
      Instance.keys(instance),
      Pact.map((keyNode) => JsonPointer.append(/** @type {string} */ (Instance.value(keyNode)), instanceLocation)),
      Pact.collectSet
    );

    const discriminators = Pact.pipe(
      instanceProps,
      Pact.filter((propLocation) => Pact.some((alternative) => propertyPasses(alternative[propLocation]), anyOf)),
      Pact.collectSet
    );

    let filtered = [];
    for (const alternative of anyOf) {
      // Filter alternatives whose declared type doesn't match the instance type
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

        // Filter alternative if it has no declared properties in common with the instance
        if (!declaredProps.size) {
          continue;
        }

        // Filter alternative if it has failing properties that are declared and passing in another alternative
        if (Pact.some((propLocation) => !propertyPasses(alternative[propLocation]), discriminators)) {
          continue;
        }
      }

      filtered.push(alternative);
    }

    if (filtered.length === 0) {
      filtered = anyOf;
    }

    /** @type ErrorObject[][] */
    const alternatives = [];

    if (alternatives.length === 0) {
      for (const alternative of filtered) {
        alternatives.push(await getErrors(alternative, instance, localization));
      }
    }

    if (alternatives.length === 1) {
      errors.push(...alternatives[0]);
    } else {
      errors.push({
        message: localization.getAnyOfErrorMessage(),
        alternatives,
        instanceLocation,
        schemaLocations: [schemaLocation]
      });
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

export default anyOfErrorHandler;
