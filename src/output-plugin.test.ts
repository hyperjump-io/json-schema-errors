import { afterEach, describe, expect, test } from "vitest";
import { validate, registerSchema, unregisterSchema } from "@hyperjump/json-schema";
import { JsonSchemaErrorsOutputPlugin } from "./output-plugin.js";

describe("JSON Schema Errors Output Format", () => {
  const schemaUri = "schema:main";
  const dialectUri = "https://json-schema.org/v1";

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  describe("$ref", () => {
    test("invalid", async () => {
      registerSchema({
        $ref: "#/$defs/string",
        $defs: {
          string: { type: "string" }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/$defs/string/type`]: false
          },
          "https://json-schema.org/keyword/definitions": {
            [`${schemaUri}#/$defs`]: true
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        $ref: "#/$defs/string",
        $defs: {
          string: { type: "string" }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/$defs/string/type`]: true
          },
          "https://json-schema.org/keyword/definitions": {
            [`${schemaUri}#/$defs`]: true
          }
        }
      });
    });
  });

  describe("additionalProperties", () => {
    test("invalid", async () => {
      registerSchema({ additionalProperties: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/additionalProperties`]: false
          }
        }
      });
    });

    test("invalid - multiple errors", async () => {
      registerSchema({ additionalProperties: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, bar: 24 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/additionalProperties`]: false
          }
        },
        "#/bar": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/additionalProperties`]: false
          }
        }
      });
    });

    test("invalid - schema", async () => {
      registerSchema({
        additionalProperties: { type: "string" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/additionalProperties/type`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ additionalProperties: true }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, {}, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({});
    });
  });

  describe("allOf", () => {
    test("invalid", async () => {
      registerSchema({
        allOf: [
          { type: "number" },
          { maximum: 5 }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/allOf/0/type`]: true
          },
          "https://json-schema.org/keyword/maximum": {
            [`${schemaUri}#/allOf/1/maximum`]: false
          }
        }
      });
    });

    test("invalid - multiple errors", async () => {
      registerSchema({
        type: "number",
        allOf: [
          { maximum: 2 },
          { maximum: 5 }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/type`]: true
          },
          "https://json-schema.org/keyword/maximum": {
            [`${schemaUri}#/allOf/0/maximum`]: false,
            [`${schemaUri}#/allOf/1/maximum`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        allOf: [
          { type: "number" },
          { maximum: 5 }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 3, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/allOf/0/type`]: true
          },
          "https://json-schema.org/keyword/maximum": {
            [`${schemaUri}#/allOf/1/maximum`]: true
          }
        }
      });
    });
  });

  describe("anyOf", () => {
    test("invalid", async () => {
      registerSchema({
        anyOf: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, true, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/anyOf": {
            [`${schemaUri}#/anyOf`]: [
              {
                "#": {
                  "https://json-schema.org/keyword/type": {
                    [`${schemaUri}#/anyOf/0/type`]: false
                  }
                }
              },
              {
                "#": {
                  "https://json-schema.org/keyword/type": {
                    [`${schemaUri}#/anyOf/1/type`]: false
                  }
                }
              }
            ]
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        anyOf: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/anyOf": {
            [`${schemaUri}#/anyOf`]: true
          }
        }
      });
    });
  });

  describe("oneOf", () => {
    test("invalid", async () => {
      registerSchema({
        oneOf: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, true, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/oneOf": {
            [`${schemaUri}#/oneOf`]: [
              {
                "#": {
                  "https://json-schema.org/keyword/type": {
                    [`${schemaUri}#/oneOf/0/type`]: false
                  }
                }
              },
              {
                "#": {
                  "https://json-schema.org/keyword/type": {
                    [`${schemaUri}#/oneOf/1/type`]: false
                  }
                }
              }
            ]
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        oneOf: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/oneOf": {
            [`${schemaUri}#/oneOf`]: true
          }
        }
      });
    });
  });

  describe("not", () => {
    test("invalid", async () => {
      registerSchema({
        not: { type: "number" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/not": {
            [`${schemaUri}#/not`]: [
              {
                "#": {
                  "https://json-schema.org/keyword/type": {
                    [`${schemaUri}#/not/type`]: true
                  }
                }
              }
            ]
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        not: { type: "number" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/not": {
            [`${schemaUri}#/not`]: true
          }
        }
      });
    });
  });

  describe("contains", () => {
    test("invalid", async () => {
      registerSchema({
        contains: { type: "string" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [1, 2], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/contains": {
            [`${schemaUri}#/contains`]: [
              {
                "#/0": {
                  "https://json-schema.org/keyword/type": {
                    [`${schemaUri}#/contains/type`]: false
                  }
                }
              },
              {
                "#/1": {
                  "https://json-schema.org/keyword/type": {
                    [`${schemaUri}#/contains/type`]: false
                  }
                }
              }
            ]
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        contains: { type: "string" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [1, "foo"], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/contains": {
            [`${schemaUri}#/contains`]: true
          }
        }
      });
    });
  });

  describe("dependentSchemas", () => {
    test("invalid", async () => {
      registerSchema({
        dependentSchemas: {
          foo: { required: ["a"] }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/required": {
            [`${schemaUri}#/dependentSchemas/foo/required`]: false
          }
        }
      });
    });

    test("invalid - multiple conditions fail", async () => {
      registerSchema({
        dependentSchemas: {
          foo: { required: ["a"] },
          bar: { required: ["b"] }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, bar: 24 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/required": {
            [`${schemaUri}#/dependentSchemas/foo/required`]: false,
            [`${schemaUri}#/dependentSchemas/bar/required`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        dependentSchemas: {
          foo: { required: ["a"] }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, a: true }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/required": {
            [`${schemaUri}#/dependentSchemas/foo/required`]: true
          }
        }
      });
    });
  });

  describe("then", () => {
    test("invalid", async () => {
      registerSchema({
        if: { type: "string" },
        then: { minLength: 1 }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/if/type`]: true
          },
          "https://json-schema.org/keyword/minLength": {
            [`${schemaUri}#/then/minLength`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        if: { type: "string" },
        then: { minLength: 1 }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/if/type`]: true
          },
          "https://json-schema.org/keyword/minLength": {
            [`${schemaUri}#/then/minLength`]: true
          }
        }
      });
    });
  });

  describe("else", () => {
    test("invalid", async () => {
      registerSchema({
        type: ["string", "number"],
        if: { type: "string" },
        else: { minimum: 42 }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 5, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/type`]: true,
            [`${schemaUri}#/if/type`]: false
          },
          "https://json-schema.org/keyword/minimum": {
            [`${schemaUri}#/else/minimum`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        type: ["string", "number"],
        if: { type: "string" },
        else: { minimum: 5 }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/type`]: true,
            [`${schemaUri}#/if/type`]: false
          },
          "https://json-schema.org/keyword/minimum": {
            [`${schemaUri}#/else/minimum`]: true
          }
        }
      });
    });
  });

  describe("items", () => {
    test("invalid", async () => {
      registerSchema({
        items: { type: "string" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [42, 24], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/0": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/items/type`]: false
          }
        },
        "#/1": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/items/type`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        items: { type: "string" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, ["foo"], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/0": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/items/type`]: true
          }
        }
      });
    });
  });

  describe("patternProperties", () => {
    test("invalid", async () => {
      registerSchema({
        patternProperties: {
          "^f": { type: "string" },
          "^b": { type: "number" }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, bar: true }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/patternProperties/%5Ef/type`]: false
          }
        },
        "#/bar": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/patternProperties/%5Eb/type`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        patternProperties: {
          "^f": { type: "string" },
          "^b": { type: "number" }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: "a", bar: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/patternProperties/%5Ef/type`]: true
          }
        },
        "#/bar": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/patternProperties/%5Eb/type`]: true
          }
        }
      });
    });
  });

  describe("prefixItems", () => {
    test("invalid", async () => {
      registerSchema({
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [42, "foo"], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/0": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/prefixItems/0/type`]: false
          }
        },
        "#/1": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/prefixItems/1/type`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, ["foo", 42], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/0": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/prefixItems/0/type`]: true
          }
        },
        "#/1": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/prefixItems/1/type`]: true
          }
        }
      });
    });
  });

  describe("properties", () => {
    test("invalid", async () => {
      registerSchema({
        properties: {
          foo: { type: "string" },
          bar: { type: "number" }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, bar: true }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/properties/foo/type`]: false
          }
        },
        "#/bar": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/properties/bar/type`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        properties: {
          foo: { type: "string" },
          bar: { type: "number" }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: "a", bar: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/properties/foo/type`]: true
          }
        },
        "#/bar": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/properties/bar/type`]: true
          }
        }
      });
    });
  });

  describe("propertyNames", () => {
    test("invalid", async () => {
      registerSchema({
        propertyNames: { pattern: "^a" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { banana: true, pear: false }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#*/banana": {
          "https://json-schema.org/keyword/pattern": {
            [`${schemaUri}#/propertyNames/pattern`]: false
          }
        },
        "#*/pear": {
          "https://json-schema.org/keyword/pattern": {
            [`${schemaUri}#/propertyNames/pattern`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        propertyNames: { pattern: "^a" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { apple: true }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#*/apple": {
          "https://json-schema.org/keyword/pattern": {
            [`${schemaUri}#/propertyNames/pattern`]: true
          }
        }
      });
    });
  });

  describe("unevaluatedProperties", () => {
    test("invalid - boolean", async () => {
      registerSchema({ unevaluatedProperties: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/unevaluatedProperties`]: false
          }
        }
      });
    });

    test("invalid - with sibling property declarations", async () => {
      registerSchema({
        properties: {
          foo: true,
          bar: false
        },
        unevaluatedProperties: false
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, bar: true, baz: null }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/bar": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/properties/bar`]: false
          }
        },
        "#/baz": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/unevaluatedProperties`]: false
          }
        }
      });
    });

    test("invalid - schema", async () => {
      registerSchema({
        unevaluatedProperties: { type: "string" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/foo": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/unevaluatedProperties/type`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ unevaluatedProperties: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, {}, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({});
    });
  });

  describe("unevaluatedItems", () => {
    test("invalid - boolean", async () => {
      registerSchema({ unevaluatedItems: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [42], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/0": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/unevaluatedItems`]: false
          }
        }
      });
    });

    test("invalid - schema", async () => {
      registerSchema({
        unevaluatedItems: { type: "string" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [42], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/0": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/unevaluatedItems/type`]: false
          }
        }
      });
    });

    test("invalid - with sibling property declarations", async () => {
      registerSchema({
        prefixItems: [true, false],
        unevaluatedItems: false
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [42, true, null], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#/1": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/prefixItems/1`]: false
          }
        },
        "#/2": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/unevaluatedItems`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ unevaluatedItems: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({});
    });
  });

  describe("const", () => {
    test("invalid", async () => {
      registerSchema({ const: "foo" }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/const": {
            [`${schemaUri}#/const`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ const: "foo" }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/const": {
            [`${schemaUri}#/const`]: true
          }
        }
      });
    });
  });

  describe("dependentRequired", () => {
    test("invalid", async () => {
      registerSchema({
        dependentRequired: {
          foo: ["a"]
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/dependentRequired": {
            [`${schemaUri}#/dependentRequired`]: false
          }
        }
      });
    });

    test("invalid - multiple conditions fail", async () => {
      registerSchema({
        dependentRequired: {
          foo: ["a"],
          bar: ["b"]
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, bar: 24 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/dependentRequired": {
            [`${schemaUri}#/dependentRequired`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({
        dependentRequired: {
          foo: ["a"]
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, a: true }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/dependentRequired": {
            [`${schemaUri}#/dependentRequired`]: true
          }
        }
      });
    });
  });

  describe("enum", () => {
    test("invalid", async () => {
      registerSchema({ enum: ["foo"] }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/enum": {
            [`${schemaUri}#/enum`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ enum: ["foo"] }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/enum": {
            [`${schemaUri}#/enum`]: true
          }
        }
      });
    });
  });

  describe("exclusiveMaximum", () => {
    test("invalid", async () => {
      registerSchema({ exclusiveMaximum: 5 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/exclusiveMaximum": {
            [`${schemaUri}#/exclusiveMaximum`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ exclusiveMaximum: 42 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 5, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/exclusiveMaximum": {
            [`${schemaUri}#/exclusiveMaximum`]: true
          }
        }
      });
    });
  });

  describe("exclusiveMinimum", () => {
    test("invalid", async () => {
      registerSchema({ exclusiveMinimum: 42 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 5, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/exclusiveMinimum": {
            [`${schemaUri}#/exclusiveMinimum`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ exclusiveMinimum: 5 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/exclusiveMinimum": {
            [`${schemaUri}#/exclusiveMinimum`]: true
          }
        }
      });
    });
  });

  describe("maxItems", () => {
    test("invalid", async () => {
      registerSchema({ maxItems: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [1, 2], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/maxItems": {
            [`${schemaUri}#/maxItems`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ maxItems: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/maxItems": {
            [`${schemaUri}#/maxItems`]: true
          }
        }
      });
    });
  });

  describe("minItems", () => {
    test("invalid", async () => {
      registerSchema({ minItems: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/minItems": {
            [`${schemaUri}#/minItems`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ minItems: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [1, 2], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/minItems": {
            [`${schemaUri}#/minItems`]: true
          }
        }
      });
    });
  });

  describe("maxLength", () => {
    test("invalid", async () => {
      registerSchema({ maxLength: 2 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/maxLength": {
            [`${schemaUri}#/maxLength`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ maxLength: 2 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "a", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/maxLength": {
            [`${schemaUri}#/maxLength`]: true
          }
        }
      });
    });
  });

  describe("minLength", () => {
    test("invalid", async () => {
      registerSchema({ minLength: 2 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "a", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/minLength": {
            [`${schemaUri}#/minLength`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ minLength: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/minLength": {
            [`${schemaUri}#/minLength`]: true
          }
        }
      });
    });
  });

  describe("maxProperties", () => {
    test("invalid", async () => {
      registerSchema({ maxProperties: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { a: 1, b: 2 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/maxProperties": {
            [`${schemaUri}#/maxProperties`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ maxProperties: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, {}, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/maxProperties": {
            [`${schemaUri}#/maxProperties`]: true
          }
        }
      });
    });
  });

  describe("minProperties", () => {
    test("invalid", async () => {
      registerSchema({ minProperties: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, {}, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/minProperties": {
            [`${schemaUri}#/minProperties`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ minProperties: 1 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { a: 1, b: 2 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/minProperties": {
            [`${schemaUri}#/minProperties`]: true
          }
        }
      });
    });
  });

  describe("maximum", () => {
    test("invalid", async () => {
      registerSchema({ maximum: 5 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/maximum": {
            [`${schemaUri}#/maximum`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ maximum: 42 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 5, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/maximum": {
            [`${schemaUri}#/maximum`]: true
          }
        }
      });
    });
  });

  describe("minimum", () => {
    test("invalid", async () => {
      registerSchema({ minimum: 42 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 5, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/minimum": {
            [`${schemaUri}#/minimum`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ minimum: 5 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/minimum": {
            [`${schemaUri}#/minimum`]: true
          }
        }
      });
    });
  });

  describe("multipleOf", () => {
    test("invalid", async () => {
      registerSchema({ multipleOf: 2 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 3, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/multipleOf": {
            [`${schemaUri}#/multipleOf`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ multipleOf: 2 }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 4, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/multipleOf": {
            [`${schemaUri}#/multipleOf`]: true
          }
        }
      });
    });
  });

  describe("pattern", () => {
    test("invalid", async () => {
      registerSchema({ pattern: "^a" }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "banana", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/pattern": {
            [`${schemaUri}#/pattern`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ pattern: "^a" }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "apple", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/pattern": {
            [`${schemaUri}#/pattern`]: true
          }
        }
      });
    });
  });

  describe("required", () => {
    test("invalid", async () => {
      registerSchema({ required: ["a"] }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, {}, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/required": {
            [`${schemaUri}#/required`]: false
          }
        }
      });
    });

    test("invalid - multiple missing", async () => {
      registerSchema({ required: ["a", "b"] }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, {}, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/required": {
            [`${schemaUri}#/required`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ required: ["a"] }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { a: 1 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/required": {
            [`${schemaUri}#/required`]: true
          }
        }
      });
    });
  });

  describe("type", () => {
    test("invalid", async () => {
      registerSchema({ type: "string" }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/type`]: false
          }
        }
      });
    });

    test("invalid - multiple types", async () => {
      registerSchema({ type: ["string", "null"] }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 42, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/type`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ type: "string" }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, "foo", { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/type`]: true
          }
        }
      });
    });
  });

  describe("uniqueItems", () => {
    test("invalid", async () => {
      registerSchema({ uniqueItems: true }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [1, 1], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/uniqueItems": {
            [`${schemaUri}#/uniqueItems`]: false
          }
        }
      });
    });

    test("valid", async () => {
      registerSchema({ uniqueItems: true }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [1, 2], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/uniqueItems": {
            [`${schemaUri}#/uniqueItems`]: true
          }
        }
      });
    });
  });

  test("Multiple errors in schema", async () => {
    registerSchema({
      properties: {
        foo: { type: "string" },
        bar: { type: "boolean" }
      },
      required: ["foo", "bar"]
    }, schemaUri, dialectUri);
    const outputPlugin = new JsonSchemaErrorsOutputPlugin();
    await validate(schemaUri, { foo: 42 }, { plugins: [outputPlugin] });

    expect(outputPlugin.output).to.eql({
      "#": {
        "https://json-schema.org/keyword/required": {
          [`${schemaUri}#/required`]: false
        }
      },
      "#/foo": {
        "https://json-schema.org/keyword/type": {
          [`${schemaUri}#/properties/foo/type`]: false
        }
      }
    });
  });

  test("Deeply nested", async () => {
    registerSchema({
      properties: {
        foo: {
          properties: {
            bar: { type: "boolean" }
          }
        }
      }
    }, schemaUri, dialectUri);
    const outputPlugin = new JsonSchemaErrorsOutputPlugin();
    await validate(schemaUri, { foo: { bar: 42 } }, { plugins: [outputPlugin] });

    expect(outputPlugin.output).to.eql({
      "#/foo/bar": {
        "https://json-schema.org/keyword/type": {
          [`${schemaUri}#/properties/foo/properties/bar/type`]: false
        }
      }
    });
  });
});
