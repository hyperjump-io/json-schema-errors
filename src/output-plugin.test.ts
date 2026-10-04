import { afterEach, describe, expect, test } from "vitest";
import { validate, registerSchema, unregisterSchema } from "@hyperjump/json-schema";
import "./index.js";
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
            [`${schemaUri}#/$defs/string/type`]: { valid: false }
          },
          "https://json-schema.org/keyword/definitions": {
            [`${schemaUri}#/$defs`]: { valid: true }
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
            [`${schemaUri}#/$defs/string/type`]: { valid: true }
          },
          "https://json-schema.org/keyword/definitions": {
            [`${schemaUri}#/$defs`]: { valid: true }
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
            [`${schemaUri}#/additionalProperties`]: { valid: false }
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
            [`${schemaUri}#/additionalProperties`]: { valid: false }
          }
        },
        "#/bar": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/additionalProperties`]: { valid: false }
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
            [`${schemaUri}#/additionalProperties/type`]: { valid: false }
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
            [`${schemaUri}#/allOf/0/type`]: { valid: true }
          },
          "https://json-schema.org/keyword/maximum": {
            [`${schemaUri}#/allOf/1/maximum`]: { valid: false }
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
            [`${schemaUri}#/type`]: { valid: true }
          },
          "https://json-schema.org/keyword/maximum": {
            [`${schemaUri}#/allOf/0/maximum`]: { valid: false },
            [`${schemaUri}#/allOf/1/maximum`]: { valid: false }
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
            [`${schemaUri}#/allOf/0/type`]: { valid: true }
          },
          "https://json-schema.org/keyword/maximum": {
            [`${schemaUri}#/allOf/1/maximum`]: { valid: true }
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
            [`${schemaUri}#/anyOf`]: {
              valid: false,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/anyOf/0/type`]: { valid: false }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/anyOf/1/type`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/anyOf`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/anyOf/0/type`]: { valid: true }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/anyOf/1/type`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/oneOf`]: {
              valid: false,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/oneOf/0/type`]: { valid: false }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/oneOf/1/type`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/oneOf`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/oneOf/0/type`]: { valid: true }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/oneOf/1/type`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/not`]: {
              valid: false,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/not/type`]: { valid: true }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/not`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/not/type`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/contains`]: {
              valid: false,
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/contains/type`]: { valid: false }
                    }
                  }
                },
                {
                  "#/1": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/contains/type`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/contains`]: {
              valid: true,
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/contains/type`]: { valid: false }
                    }
                  }
                },
                {
                  "#/1": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/contains/type`]: { valid: true }
                    }
                  }
                }
              ]
            }
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
          "https://json-schema.org/keyword/dependentSchemas": {
            [`${schemaUri}#/dependentSchemas`]: {
              valid: false,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/required": {
                      [`${schemaUri}#/dependentSchemas/foo/required`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
          "https://json-schema.org/keyword/dependentSchemas": {
            [`${schemaUri}#/dependentSchemas`]: {
              valid: false,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/required": {
                      [`${schemaUri}#/dependentSchemas/foo/required`]: { valid: false }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/required": {
                      [`${schemaUri}#/dependentSchemas/bar/required`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
          "https://json-schema.org/keyword/dependentSchemas": {
            [`${schemaUri}#/dependentSchemas`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/required": {
                      [`${schemaUri}#/dependentSchemas/foo/required`]: { valid: true }
                    }
                  }
                }
              ]
            }
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
          "https://json-schema.org/keyword/if": {
            [`${schemaUri}#/if`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/if/type`]: { valid: true }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/then": {
            [`${schemaUri}#/then`]: {
              valid: false,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/minLength": {
                      [`${schemaUri}#/then/minLength`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
          "https://json-schema.org/keyword/if": {
            [`${schemaUri}#/if`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/if/type`]: { valid: true }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/then": {
            [`${schemaUri}#/then`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/minLength": {
                      [`${schemaUri}#/then/minLength`]: { valid: true }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/type`]: { valid: true }
          },
          "https://json-schema.org/keyword/if": {
            [`${schemaUri}#/if`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/if/type`]: { valid: false }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/else": {
            [`${schemaUri}#/else`]: {
              valid: false,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/minimum": {
                      [`${schemaUri}#/else/minimum`]: { valid: false }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/type`]: { valid: true }
          },
          "https://json-schema.org/keyword/if": {
            [`${schemaUri}#/if`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/if/type`]: { valid: false }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/else": {
            [`${schemaUri}#/else`]: {
              valid: true,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/minimum": {
                      [`${schemaUri}#/else/minimum`]: { valid: true }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/items/type`]: { valid: false }
          }
        },
        "#/1": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/items/type`]: { valid: false }
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
            [`${schemaUri}#/items/type`]: { valid: true }
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
            [`${schemaUri}#/patternProperties/%5Ef/type`]: { valid: false }
          }
        },
        "#/bar": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/patternProperties/%5Eb/type`]: { valid: false }
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
            [`${schemaUri}#/patternProperties/%5Ef/type`]: { valid: true }
          }
        },
        "#/bar": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/patternProperties/%5Eb/type`]: { valid: true }
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
            [`${schemaUri}#/prefixItems/0/type`]: { valid: false }
          }
        },
        "#/1": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/prefixItems/1/type`]: { valid: false }
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
            [`${schemaUri}#/prefixItems/0/type`]: { valid: true }
          }
        },
        "#/1": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/prefixItems/1/type`]: { valid: true }
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
            [`${schemaUri}#/properties/foo/type`]: { valid: false }
          }
        },
        "#/bar": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/properties/bar/type`]: { valid: false }
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
            [`${schemaUri}#/properties/foo/type`]: { valid: true }
          }
        },
        "#/bar": {
          "https://json-schema.org/keyword/type": {
            [`${schemaUri}#/properties/bar/type`]: { valid: true }
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
            [`${schemaUri}#/propertyNames/pattern`]: { valid: false }
          }
        },
        "#*/pear": {
          "https://json-schema.org/keyword/pattern": {
            [`${schemaUri}#/propertyNames/pattern`]: { valid: false }
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
            [`${schemaUri}#/propertyNames/pattern`]: { valid: true }
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
            [`${schemaUri}#/unevaluatedProperties`]: { valid: false }
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
            [`${schemaUri}#/properties/bar`]: { valid: false }
          }
        },
        "#/baz": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/unevaluatedProperties`]: { valid: false }
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
            [`${schemaUri}#/unevaluatedProperties/type`]: { valid: false }
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
            [`${schemaUri}#/unevaluatedItems`]: { valid: false }
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
            [`${schemaUri}#/unevaluatedItems/type`]: { valid: false }
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
            [`${schemaUri}#/prefixItems/1`]: { valid: false }
          }
        },
        "#/2": {
          "https://json-schema.org/validation": {
            [`${schemaUri}#/unevaluatedItems`]: { valid: false }
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
            [`${schemaUri}#/const`]: { valid: false }
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
            [`${schemaUri}#/const`]: { valid: true }
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
            [`${schemaUri}#/dependentRequired`]: { valid: false }
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
            [`${schemaUri}#/dependentRequired`]: { valid: false }
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
            [`${schemaUri}#/dependentRequired`]: { valid: true }
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
            [`${schemaUri}#/enum`]: { valid: false }
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
            [`${schemaUri}#/enum`]: { valid: true }
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
            [`${schemaUri}#/exclusiveMaximum`]: { valid: false }
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
            [`${schemaUri}#/exclusiveMaximum`]: { valid: true }
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
            [`${schemaUri}#/exclusiveMinimum`]: { valid: false }
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
            [`${schemaUri}#/exclusiveMinimum`]: { valid: true }
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
            [`${schemaUri}#/maxItems`]: { valid: false }
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
            [`${schemaUri}#/maxItems`]: { valid: true }
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
            [`${schemaUri}#/minItems`]: { valid: false }
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
            [`${schemaUri}#/minItems`]: { valid: true }
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
            [`${schemaUri}#/maxLength`]: { valid: false }
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
            [`${schemaUri}#/maxLength`]: { valid: true }
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
            [`${schemaUri}#/minLength`]: { valid: false }
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
            [`${schemaUri}#/minLength`]: { valid: true }
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
            [`${schemaUri}#/maxProperties`]: { valid: false }
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
            [`${schemaUri}#/maxProperties`]: { valid: true }
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
            [`${schemaUri}#/minProperties`]: { valid: false }
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
            [`${schemaUri}#/minProperties`]: { valid: true }
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
            [`${schemaUri}#/maximum`]: { valid: false }
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
            [`${schemaUri}#/maximum`]: { valid: true }
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
            [`${schemaUri}#/minimum`]: { valid: false }
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
            [`${schemaUri}#/minimum`]: { valid: true }
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
            [`${schemaUri}#/multipleOf`]: { valid: false }
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
            [`${schemaUri}#/multipleOf`]: { valid: true }
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
            [`${schemaUri}#/pattern`]: { valid: false }
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
            [`${schemaUri}#/pattern`]: { valid: true }
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
            [`${schemaUri}#/required`]: { valid: false }
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
            [`${schemaUri}#/required`]: { valid: false }
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
            [`${schemaUri}#/required`]: { valid: true }
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
            [`${schemaUri}#/type`]: { valid: false }
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
            [`${schemaUri}#/type`]: { valid: false }
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
            [`${schemaUri}#/type`]: { valid: true }
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
            [`${schemaUri}#/uniqueItems`]: { valid: false }
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
            [`${schemaUri}#/uniqueItems`]: { valid: true }
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
          [`${schemaUri}#/required`]: { valid: false }
        }
      },
      "#/foo": {
        "https://json-schema.org/keyword/type": {
          [`${schemaUri}#/properties/foo/type`]: { valid: false }
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
          [`${schemaUri}#/properties/foo/properties/bar/type`]: { valid: false }
        }
      }
    });
  });
});
