import enUS from "./en-US.js";

/**
 * @typedef {{
 *   ftl: string;
 *   direction: "ltr" | "rtl";
 * }} Translation
 */

/** @type Record<string, Translation> */
export const translations = {
  "en-US": { ftl: enUS, direction: "ltr" }
};
