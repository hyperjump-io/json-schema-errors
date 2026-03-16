  import * as Instance from "@hyperjump/json-schema/instance/experimental";
  import { getPassing } from "../json-schema-errors.js";

  /**
   * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
   */

  /** @type ErrorHandler */
  // eslint-disable-next-line @typescript-eslint/require-await
const notErrorHandler = async (normalizedErrors, instance, localization) => {
  const errors = [];

  const keywordErrors = normalizedErrors["https://json-schema.org/keyword/not"];
  if (!keywordErrors) return [];

  for (const schemaLocation in keywordErrors) {
    const result = keywordErrors[schemaLocation];

    if (result === true) continue;

    const alternatives = [];

    if (Array.isArray(result)) {
      for (const suboutput of result) {
        const instanceLocation = Instance.uri(instance);
        const instanceOutput = suboutput[instanceLocation];

        if (!instanceOutput) continue;

        const passing = await getPassing(instanceOutput, instance, localization, {
          negated: true
        });

        alternatives.push(...passing);
      }
    }

    errors.push({
      message: localization.getNotErrorMessage(),
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation],
      alternatives
    });
  }

  return errors;
};

export default notErrorHandler;
