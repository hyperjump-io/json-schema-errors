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

    if (Instance.typeOf(instance) === "object") {
      const instanceProps = Pact.collectSet(
        Pact.map(
          (keyNode) => /** @type {string} */ (Instance.value(keyNode)),
          Instance.keys(instance)
        )
      );
      const prefix = `${instanceLocation}/`;

      filtered = [];
      for (const alternative of anyOf) {
        const typeResults = alternative[instanceLocation]["https://json-schema.org/keyword/type"];
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
      for (const alternative of anyOf) {
        const typeResults = alternative[instanceLocation]["https://json-schema.org/keyword/type"];
        if (!typeResults || Object.values(typeResults).every((isValid) => isValid)) {
          filtered.push(alternative);
        }
      }
    }

    if (filtered.length === 0) {
      filtered = anyOf;
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

/** @type (propOutput: NormalizedOutput[string] | undefined) => boolean */
const propertyPasses = (propOutput) => {
  if (!propOutput || Object.keys(propOutput).length === 0) {
    return false;
  }
  return Object.values(propOutput).every((keywordResults) => Object.values(keywordResults).every((v) => v === true));
};

export default anyOfErrorHandler;
