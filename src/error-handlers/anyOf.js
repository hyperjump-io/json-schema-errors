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
    let filtered = anyOf;

    const instanceProps = Pact.pipe(
      Instance.keys(instance),
      Pact.map((keyNode) => /** @type {string} */ (Instance.value(keyNode))),
      Pact.collectSet
    );

    const discriminators = Pact.pipe(
      instanceProps,
      Pact.filter((prop) => {
        const propLocation = JsonPointer.append(prop, instanceLocation);
        return Pact.some((alternative) => propertyPasses(alternative[propLocation]), anyOf);
      }),
      Pact.collectSet
    );

    const prefix = `${instanceLocation}/`;

    filtered = [];
    for (const alternative of anyOf) {
      // Filter alternatives whose declared type doesn't match the instance type
      const typeResults = alternative[instanceLocation]["https://json-schema.org/keyword/type"];
      if (typeResults && !Object.values(typeResults).every((isValid) => isValid)) {
        continue;
      }

      if (Instance.typeOf(instance) === "object") {
        const declaredProps = Pact.pipe(
          Object.keys(alternative),
          Pact.filter((loc) => loc.startsWith(prefix)),
          Pact.map((loc) => /** @type {string} */ (Pact.head(JsonPointer.pointerSegments(loc.slice(prefix.length - 1))))),
          Pact.collectSet
        );

        // Filter alternative if it has no declared properties in common with the instance
        if (!Pact.some((prop) => declaredProps.has(prop), instanceProps)) {
          continue;
        }

        // Filter alternative if it has failing properties that are decalred and passing in another alternative
        if (Pact.some((prop) => !propertyPasses(alternative[JsonPointer.append(prop, instanceLocation)]), discriminators)) {
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
