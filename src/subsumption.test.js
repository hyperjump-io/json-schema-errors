/**
 * @import { NormalizedOutput } from "./index.js";
 */
import { describe, test, expect } from "vitest";
import { isSubsumed } from "./subsumption.js";

describe("Algebraic Error Subsumption", () => {
  test("type string subsumes type string + minLength", () => {
    /** @type NormalizedOutput */
    const altA = {
      "": {
        "https://json-schema.org/keyword/type": { "/type": false }
      }
    };
    /** @type NormalizedOutput */
    const altB = {
      "": {
        "https://json-schema.org/keyword/type": { "/type": false },
        "https://json-schema.org/keyword/minLength": { "/minLength": false }
      }
    };

    /** @type {(loc: string) => any} */
    const getValue = (loc) => {
      if (loc === "/type") {
        return "string";
      }
      if (loc === "/minLength") {
        return 3;
      }
    };

    expect(isSubsumed(altA, altB, getValue)).toBe(true);
    expect(isSubsumed(altB, altA, getValue)).toBe(false);
  });

  test("broader type array subsumes strict type", () => {
    /** @type NormalizedOutput */
    const altA = {
      "": {
        "https://json-schema.org/keyword/type": { "/type": false }
      }
    };
    /** @type NormalizedOutput */
    const altB = {
      "": {
        "https://json-schema.org/keyword/type": { "/type_strict": false }
      }
    };

    /** @type {(loc: string) => any} */
    const getValue = (loc) => {
      if (loc === "/type") {
        return ["string", "number"];
      }
      if (loc === "/type_strict") {
        return "string";
      }
    };

    expect(isSubsumed(altA, altB, getValue)).toBe(true);
    expect(isSubsumed(altB, altA, getValue)).toBe(false);
  });

  test("enum subsumes narrower enum", () => {
    /** @type NormalizedOutput */
    const altA = {
      "": {
        "https://json-schema.org/keyword/enum": { "/enum_broad": false }
      }
    };
    /** @type NormalizedOutput */
    const altB = {
      "": {
        "https://json-schema.org/keyword/enum": { "/enum_strict": false }
      }
    };

    /** @type {(loc: string) => any} */
    const getValue = (loc) => {
      if (loc === "/enum_broad") {
        return ["a", "b"];
      }
      if (loc === "/enum_strict") {
        return ["a"];
      }
    };

    expect(isSubsumed(altA, altB, getValue)).toBe(true);
    expect(isSubsumed(altB, altA, getValue)).toBe(false);
  });

  test("enum subsumes const", () => {
    /** @type NormalizedOutput */
    const altA = {
      "": {
        "https://json-schema.org/keyword/enum": { "/enum_broad": false }
      }
    };
    /** @type NormalizedOutput */
    const altB = {
      "": {
        "https://json-schema.org/keyword/const": { "/const_a": false }
      }
    };

    /** @type {(loc: string) => any} */
    const getValue = (loc) => {
      if (loc === "/enum_broad") {
        return ["a", "b"];
      }
      if (loc === "/const_a") {
        return "a";
      }
    };

    expect(isSubsumed(altA, altB, getValue)).toBe(true);
    expect(isSubsumed(altB, altA, getValue)).toBe(false);
  });

  test("nested objects", () => {
    /** @type NormalizedOutput */
    const altA = {
      "/foo": {
        "https://json-schema.org/keyword/type": { "/properties/foo/type": false }
      }
    };
    /** @type NormalizedOutput */
    const altB = {
      "/foo": {
        "https://json-schema.org/keyword/type": { "/properties/foo/type": false },
        "https://json-schema.org/keyword/minLength": { "/properties/foo/minLength": false }
      }
    };

    /** @type {(loc: string) => any} */
    const getValue = (loc) => {
      if (loc === "/properties/foo/type") {
        return "string";
      }
      if (loc === "/properties/foo/minLength") {
        return 3;
      }
    };

    expect(isSubsumed(altA, altB, getValue)).toBe(true);
    expect(isSubsumed(altB, altA, getValue)).toBe(false);
  });

  test("nested applicators subsume child const", () => {
    /** @type NormalizedOutput */
    const altA = {
      "": {
        "https://json-schema.org/keyword/anyOf": {
          "/anyOf": [
            { "": { "https://json-schema.org/keyword/const": { "/anyOf/0/const": false } } },
            { "": { "https://json-schema.org/keyword/const": { "/anyOf/1/const": false } } }
          ]
        }
      }
    };

    /** @type NormalizedOutput */
    const altB = {
      "": {
        "https://json-schema.org/keyword/const": { "/anyOf/0/const": false }
      }
    };

    const getValue = () => null;

    expect(isSubsumed(altA, altB, getValue)).toBe(true);
    expect(isSubsumed(altB, altA, getValue)).toBe(false);
  });
});
