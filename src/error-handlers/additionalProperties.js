/**
 * This handler no longer emits messages for boolean `false` schemas — those
 * are handled centrally. Keep signature parameters but prefix with underscores
 * so lint doesn't complain about unused args.
 */

/**
 * @import { ErrorHandler, ErrorObject } from "../index.d.ts"
 */

/** @type ErrorHandler */
// eslint-disable-next-line @typescript-eslint/require-await
const additionalProperties = async (_normalizedErrors, _instance, _localization) => {
  /** @type ErrorObject[] */
  const errors = [];
  // additionalProperties false-schema cases are handled centrally by the
  // `https://json-schema.org/validation` error handler to avoid duplicating
  // boolean-schema messaging logic across multiple handlers.
  return errors;
};

export default additionalProperties;
