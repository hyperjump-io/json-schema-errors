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
          "https://json-schema.org/keyword/ref": {
            [`${schemaUri}#/$ref`]: {
              valid: false,
              value: `${schemaUri}#/$defs/string`,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/$defs/string/type`]: { valid: false, value: "string" }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/definitions": {
            [`${schemaUri}#/$defs`]: { valid: true, value: [`${schemaUri}#/$defs/string`] }
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
          "https://json-schema.org/keyword/ref": {
            [`${schemaUri}#/$ref`]: {
              valid: true,
              value: `${schemaUri}#/$defs/string`,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/$defs/string/type`]: { valid: true, value: "string" }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/definitions": {
            [`${schemaUri}#/$defs`]: { valid: true, value: [`${schemaUri}#/$defs/string`] }
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
        "#": {
          "https://json-schema.org/keyword/additionalProperties": {
            [`${schemaUri}#/additionalProperties`]: {
              valid: false,
              value: [/(?!)/u, `${schemaUri}#/additionalProperties`],
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/additionalProperties`]: { valid: false, value: false }
                    }
                  }
                }
              ]
            }
          }
        }
      });
    });

    test("invalid - multiple errors", async () => {
      registerSchema({ additionalProperties: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42, bar: 24 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/additionalProperties": {
            [`${schemaUri}#/additionalProperties`]: {
              valid: false,
              value: [/(?!)/u, `${schemaUri}#/additionalProperties`],
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/additionalProperties`]: { valid: false, value: false }
                    }
                  }
                },
                {
                  "#/bar": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/additionalProperties`]: { valid: false, value: false }
                    }
                  }
                }
              ]
            }
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
        "#": {
          "https://json-schema.org/keyword/additionalProperties": {
            [`${schemaUri}#/additionalProperties`]: {
              valid: false,
              value: [/(?!)/u, `${schemaUri}#/additionalProperties`],
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/additionalProperties/type`]: { valid: false, value: "string" }
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
      registerSchema({ additionalProperties: true }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, {}, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/additionalProperties": {
            [`${schemaUri}#/additionalProperties`]: {
              valid: true,
              value: [/(?!)/u, `${schemaUri}#/additionalProperties`]
            }
          }
        }
      });
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
          "https://json-schema.org/keyword/allOf": {
            [`${schemaUri}#/allOf`]: {
              valid: false,
              value: [`${schemaUri}#/allOf/0`, `${schemaUri}#/allOf/1`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/allOf/0/type`]: { valid: true, value: "number" }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/maximum": {
                      [`${schemaUri}#/allOf/1/maximum`]: { valid: false, value: 5 }
                    }
                  }
                }
              ]
            }
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
            [`${schemaUri}#/type`]: { valid: true, value: "number" }
          },
          "https://json-schema.org/keyword/allOf": {
            [`${schemaUri}#/allOf`]: {
              valid: false,
              value: [`${schemaUri}#/allOf/0`, `${schemaUri}#/allOf/1`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/maximum": {
                      [`${schemaUri}#/allOf/0/maximum`]: { valid: false, value: 2 }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/maximum": {
                      [`${schemaUri}#/allOf/1/maximum`]: { valid: false, value: 5 }
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
        allOf: [
          { type: "number" },
          { maximum: 5 }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, 3, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/allOf": {
            [`${schemaUri}#/allOf`]: {
              valid: true,
              value: [`${schemaUri}#/allOf/0`, `${schemaUri}#/allOf/1`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/allOf/0/type`]: { valid: true, value: "number" }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/maximum": {
                      [`${schemaUri}#/allOf/1/maximum`]: { valid: true, value: 5 }
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
              value: [`${schemaUri}#/anyOf/0`, `${schemaUri}#/anyOf/1`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/anyOf/0/type`]: { valid: false, value: "string" }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/anyOf/1/type`]: { valid: false, value: "number" }
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
              value: [`${schemaUri}#/anyOf/0`, `${schemaUri}#/anyOf/1`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/anyOf/0/type`]: { valid: true, value: "string" }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/anyOf/1/type`]: { valid: false, value: "number" }
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
              value: [`${schemaUri}#/oneOf/0`, `${schemaUri}#/oneOf/1`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/oneOf/0/type`]: { valid: false, value: "string" }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/oneOf/1/type`]: { valid: false, value: "number" }
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
              value: [`${schemaUri}#/oneOf/0`, `${schemaUri}#/oneOf/1`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/oneOf/0/type`]: { valid: true, value: "string" }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/oneOf/1/type`]: { valid: false, value: "number" }
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
              value: `${schemaUri}#/not`,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/not/type`]: { valid: true, value: "number" }
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
              value: `${schemaUri}#/not`,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/not/type`]: { valid: false, value: "number" }
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
              value: {
                contains: `${schemaUri}#/contains`,
                minContains: 1,
                maxContains: Number.MAX_SAFE_INTEGER
              },
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/contains/type`]: { valid: false, value: "string" }
                    }
                  }
                },
                {
                  "#/1": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/contains/type`]: { valid: false, value: "string" }
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
              value: {
                contains: `${schemaUri}#/contains`,
                minContains: 1,
                maxContains: Number.MAX_SAFE_INTEGER
              },
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/contains/type`]: { valid: false, value: "string" }
                    }
                  }
                },
                {
                  "#/1": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/contains/type`]: { valid: true, value: "string" }
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
              value: [["foo", `${schemaUri}#/dependentSchemas/foo`]],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/required": {
                      [`${schemaUri}#/dependentSchemas/foo/required`]: { valid: false, value: ["a"] }
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
              value: [
                ["foo", `${schemaUri}#/dependentSchemas/foo`],
                ["bar", `${schemaUri}#/dependentSchemas/bar`]
              ],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/required": {
                      [`${schemaUri}#/dependentSchemas/foo/required`]: { valid: false, value: ["a"] }
                    }
                  }
                },
                {
                  "#": {
                    "https://json-schema.org/keyword/required": {
                      [`${schemaUri}#/dependentSchemas/bar/required`]: { valid: false, value: ["b"] }
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
              value: [["foo", `${schemaUri}#/dependentSchemas/foo`]],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/required": {
                      [`${schemaUri}#/dependentSchemas/foo/required`]: { valid: true, value: ["a"] }
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
              value: `${schemaUri}#/if`,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/if/type`]: { valid: true, value: "string" }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/then": {
            [`${schemaUri}#/then`]: {
              valid: false,
              value: [`${schemaUri}#/if`, `${schemaUri}#/then`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/minLength": {
                      [`${schemaUri}#/then/minLength`]: { valid: false, value: 1 }
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
              value: `${schemaUri}#/if`,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/if/type`]: { valid: true, value: "string" }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/then": {
            [`${schemaUri}#/then`]: {
              valid: true,
              value: [`${schemaUri}#/if`, `${schemaUri}#/then`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/minLength": {
                      [`${schemaUri}#/then/minLength`]: { valid: true, value: 1 }
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
            [`${schemaUri}#/type`]: { valid: true, value: ["string", "number"] }
          },
          "https://json-schema.org/keyword/if": {
            [`${schemaUri}#/if`]: {
              valid: true,
              value: `${schemaUri}#/if`,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/if/type`]: { valid: false, value: "string" }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/else": {
            [`${schemaUri}#/else`]: {
              valid: false,
              value: [`${schemaUri}#/if`, `${schemaUri}#/else`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/minimum": {
                      [`${schemaUri}#/else/minimum`]: { valid: false, value: 42 }
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
            [`${schemaUri}#/type`]: { valid: true, value: ["string", "number"] }
          },
          "https://json-schema.org/keyword/if": {
            [`${schemaUri}#/if`]: {
              valid: true,
              value: `${schemaUri}#/if`,
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/if/type`]: { valid: false, value: "string" }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/else": {
            [`${schemaUri}#/else`]: {
              valid: true,
              value: [`${schemaUri}#/if`, `${schemaUri}#/else`],
              outputs: [
                {
                  "#": {
                    "https://json-schema.org/keyword/minimum": {
                      [`${schemaUri}#/else/minimum`]: { valid: true, value: 5 }
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
        "#": {
          "https://json-schema.org/keyword/items": {
            [`${schemaUri}#/items`]: {
              valid: false,
              value: [0, `${schemaUri}#/items`],
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/items/type`]: { valid: false, value: "string" }
                    }
                  }
                },
                {
                  "#/1": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/items/type`]: { valid: false, value: "string" }
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
        items: { type: "string" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, ["foo"], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/items": {
            [`${schemaUri}#/items`]: {
              valid: true,
              value: [0, `${schemaUri}#/items`],
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/items/type`]: { valid: true, value: "string" }
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
        "#": {
          "https://json-schema.org/keyword/patternProperties": {
            [`${schemaUri}#/patternProperties`]: {
              valid: false,
              value: [
                [/^f/u, `${schemaUri}#/patternProperties/%5Ef`],
                [/^b/u, `${schemaUri}#/patternProperties/%5Eb`]
              ],
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/patternProperties/%5Ef/type`]: { valid: false, value: "string" }
                    }
                  }
                },
                {
                  "#/bar": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/patternProperties/%5Eb/type`]: { valid: false, value: "number" }
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
        patternProperties: {
          "^f": { type: "string" },
          "^b": { type: "number" }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: "a", bar: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/patternProperties": {
            [`${schemaUri}#/patternProperties`]: {
              valid: true,
              value: [
                [/^f/u, `${schemaUri}#/patternProperties/%5Ef`],
                [/^b/u, `${schemaUri}#/patternProperties/%5Eb`]
              ],
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/patternProperties/%5Ef/type`]: { valid: true, value: "string" }
                    }
                  }
                },
                {
                  "#/bar": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/patternProperties/%5Eb/type`]: { valid: true, value: "number" }
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
        "#": {
          "https://json-schema.org/keyword/prefixItems": {
            [`${schemaUri}#/prefixItems`]: {
              valid: false,
              value: [
                `${schemaUri}#/prefixItems/0`,
                `${schemaUri}#/prefixItems/1`
              ],
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/prefixItems/0/type`]: { valid: false, value: "string" }
                    }
                  }
                },
                {
                  "#/1": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/prefixItems/1/type`]: { valid: false, value: "number" }
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
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, ["foo", 42], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/prefixItems": {
            [`${schemaUri}#/prefixItems`]: {
              valid: true,
              value: [
                `${schemaUri}#/prefixItems/0`,
                `${schemaUri}#/prefixItems/1`
              ],
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/prefixItems/0/type`]: { valid: true, value: "string" }
                    }
                  }
                },
                {
                  "#/1": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/prefixItems/1/type`]: { valid: true, value: "number" }
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
        "#": {
          "https://json-schema.org/keyword/properties": {
            [`${schemaUri}#/properties`]: {
              valid: false,
              value: {
                foo: `${schemaUri}#/properties/foo`,
                bar: `${schemaUri}#/properties/bar`
              },
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/properties/foo/type`]: { valid: false, value: "string" }
                    }
                  }
                },
                {
                  "#/bar": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/properties/bar/type`]: { valid: false, value: "number" }
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
        properties: {
          foo: { type: "string" },
          bar: { type: "number" }
        }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: "a", bar: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/properties": {
            [`${schemaUri}#/properties`]: {
              valid: true,
              value: {
                foo: `${schemaUri}#/properties/foo`,
                bar: `${schemaUri}#/properties/bar`
              },
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/properties/foo/type`]: { valid: true, value: "string" }
                    }
                  }
                },
                {
                  "#/bar": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/properties/bar/type`]: { valid: true, value: "number" }
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

  describe("propertyNames", () => {
    test("invalid", async () => {
      registerSchema({
        propertyNames: { pattern: "^a" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { banana: true, pear: false }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/propertyNames": {
            [`${schemaUri}#/propertyNames`]: {
              valid: false,
              value: `${schemaUri}#/propertyNames`,
              outputs: [
                {
                  "#*/banana": {
                    "https://json-schema.org/keyword/pattern": {
                      [`${schemaUri}#/propertyNames/pattern`]: { valid: false, value: /^a/u }
                    }
                  }
                },
                {
                  "#*/pear": {
                    "https://json-schema.org/keyword/pattern": {
                      [`${schemaUri}#/propertyNames/pattern`]: { valid: false, value: /^a/u }
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
        propertyNames: { pattern: "^a" }
      }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { apple: true }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/propertyNames": {
            [`${schemaUri}#/propertyNames`]: {
              valid: true,
              value: `${schemaUri}#/propertyNames`,
              outputs: [
                {
                  "#*/apple": {
                    "https://json-schema.org/keyword/pattern": {
                      [`${schemaUri}#/propertyNames/pattern`]: { valid: true, value: /^a/u }
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

  describe("unevaluatedProperties", () => {
    test("invalid - boolean", async () => {
      registerSchema({ unevaluatedProperties: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, { foo: 42 }, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/unevaluatedProperties": {
            [`${schemaUri}#/unevaluatedProperties`]: {
              valid: false,
              value: `${schemaUri}#/unevaluatedProperties`,
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/unevaluatedProperties`]: { valid: false, value: false }
                    }
                  }
                }
              ]
            }
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
        "#": {
          "https://json-schema.org/keyword/properties": {
            [`${schemaUri}#/properties`]: {
              valid: false,
              value: {
                foo: `${schemaUri}#/properties/foo`,
                bar: `${schemaUri}#/properties/bar`
              },
              outputs: [
                {
                },
                {
                  "#/bar": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/properties/bar`]: { valid: false, value: false }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/unevaluatedProperties": {
            [`${schemaUri}#/unevaluatedProperties`]: {
              valid: false,
              value: `${schemaUri}#/unevaluatedProperties`,
              outputs: [
                {
                  "#/baz": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/unevaluatedProperties`]: { valid: false, value: false }
                    }
                  }
                }
              ]
            }
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
        "#": {
          "https://json-schema.org/keyword/unevaluatedProperties": {
            [`${schemaUri}#/unevaluatedProperties`]: {
              valid: false,
              value: `${schemaUri}#/unevaluatedProperties`,
              outputs: [
                {
                  "#/foo": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/unevaluatedProperties/type`]: { valid: false, value: "string" }
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
      registerSchema({ unevaluatedProperties: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, {}, { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/unevaluatedProperties": {
            [`${schemaUri}#/unevaluatedProperties`]: { valid: true, value: `${schemaUri}#/unevaluatedProperties` }
          }
        }
      });
    });
  });

  describe("unevaluatedItems", () => {
    test("invalid - boolean", async () => {
      registerSchema({ unevaluatedItems: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [42], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/unevaluatedItems": {
            [`${schemaUri}#/unevaluatedItems`]: {
              valid: false,
              value: `${schemaUri}#/unevaluatedItems`,
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/unevaluatedItems`]: { valid: false, value: false }
                    }
                  }
                }
              ]
            }
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
        "#": {
          "https://json-schema.org/keyword/unevaluatedItems": {
            [`${schemaUri}#/unevaluatedItems`]: {
              valid: false,
              value: `${schemaUri}#/unevaluatedItems`,
              outputs: [
                {
                  "#/0": {
                    "https://json-schema.org/keyword/type": {
                      [`${schemaUri}#/unevaluatedItems/type`]: { valid: false, value: "string" }
                    }
                  }
                }
              ]
            }
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
        "#": {
          "https://json-schema.org/keyword/prefixItems": {
            [`${schemaUri}#/prefixItems`]: {
              valid: false,
              value: [
                `${schemaUri}#/prefixItems/0`,
                `${schemaUri}#/prefixItems/1`
              ],
              outputs: [
                {
                },
                {
                  "#/1": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/prefixItems/1`]: { valid: false, value: false }
                    }
                  }
                }
              ]
            }
          },
          "https://json-schema.org/keyword/unevaluatedItems": {
            [`${schemaUri}#/unevaluatedItems`]: {
              valid: false,
              value: `${schemaUri}#/unevaluatedItems`,
              outputs: [
                {
                  "#/2": {
                    "https://json-schema.org/validation": {
                      [`${schemaUri}#/unevaluatedItems`]: { valid: false, value: false }
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
      registerSchema({ unevaluatedItems: false }, schemaUri, dialectUri);
      const outputPlugin = new JsonSchemaErrorsOutputPlugin();
      await validate(schemaUri, [], { plugins: [outputPlugin] });

      expect(outputPlugin.output).to.eql({
        "#": {
          "https://json-schema.org/keyword/unevaluatedItems": {
            [`${schemaUri}#/unevaluatedItems`]: { valid: true, value: `${schemaUri}#/unevaluatedItems` }
          }
        }
      });
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
            [`${schemaUri}#/const`]: { valid: false, value: "\"foo\"" }
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
            [`${schemaUri}#/const`]: { valid: true, value: "\"foo\"" }
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
            [`${schemaUri}#/dependentRequired`]: { valid: false, value: [["foo", ["a"]]] }
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
            [`${schemaUri}#/dependentRequired`]: { valid: false, value: [["foo", ["a"]], ["bar", ["b"]]] }
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
            [`${schemaUri}#/dependentRequired`]: { valid: true, value: [["foo", ["a"]]] }
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
            [`${schemaUri}#/enum`]: { valid: false, value: ["\"foo\""] }
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
            [`${schemaUri}#/enum`]: { valid: true, value: ["\"foo\""] }
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
            [`${schemaUri}#/exclusiveMaximum`]: { valid: false, value: 5 }
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
            [`${schemaUri}#/exclusiveMaximum`]: { valid: true, value: 42 }
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
            [`${schemaUri}#/exclusiveMinimum`]: { valid: false, value: 42 }
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
            [`${schemaUri}#/exclusiveMinimum`]: { valid: true, value: 5 }
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
            [`${schemaUri}#/maxItems`]: { valid: false, value: 1 }
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
            [`${schemaUri}#/maxItems`]: { valid: true, value: 1 }
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
            [`${schemaUri}#/minItems`]: { valid: false, value: 1 }
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
            [`${schemaUri}#/minItems`]: { valid: true, value: 1 }
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
            [`${schemaUri}#/maxLength`]: { valid: false, value: 2 }
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
            [`${schemaUri}#/maxLength`]: { valid: true, value: 2 }
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
            [`${schemaUri}#/minLength`]: { valid: false, value: 2 }
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
            [`${schemaUri}#/minLength`]: { valid: true, value: 1 }
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
            [`${schemaUri}#/maxProperties`]: { valid: false, value: 1 }
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
            [`${schemaUri}#/maxProperties`]: { valid: true, value: 1 }
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
            [`${schemaUri}#/minProperties`]: { valid: false, value: 1 }
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
            [`${schemaUri}#/minProperties`]: { valid: true, value: 1 }
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
            [`${schemaUri}#/maximum`]: { valid: false, value: 5 }
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
            [`${schemaUri}#/maximum`]: { valid: true, value: 42 }
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
            [`${schemaUri}#/minimum`]: { valid: false, value: 42 }
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
            [`${schemaUri}#/minimum`]: { valid: true, value: 5 }
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
            [`${schemaUri}#/multipleOf`]: { valid: false, value: 2 }
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
            [`${schemaUri}#/multipleOf`]: { valid: true, value: 2 }
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
            [`${schemaUri}#/pattern`]: { valid: false, value: /^a/u }
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
            [`${schemaUri}#/pattern`]: { valid: true, value: /^a/u }
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
            [`${schemaUri}#/required`]: { valid: false, value: ["a"] }
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
            [`${schemaUri}#/required`]: { valid: false, value: ["a", "b"] }
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
            [`${schemaUri}#/required`]: { valid: true, value: ["a"] }
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
            [`${schemaUri}#/type`]: { valid: false, value: "string" }
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
            [`${schemaUri}#/type`]: { valid: false, value: ["string", "null"] }
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
            [`${schemaUri}#/type`]: { valid: true, value: "string" }
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
            [`${schemaUri}#/uniqueItems`]: { valid: false, value: true }
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
            [`${schemaUri}#/uniqueItems`]: { valid: true, value: true }
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
        "https://json-schema.org/keyword/properties": {
          [`${schemaUri}#/properties`]: {
            valid: false,
            value: {
              foo: `${schemaUri}#/properties/foo`,
              bar: `${schemaUri}#/properties/bar`
            },
            outputs: [
              {
                "#/foo": {
                  "https://json-schema.org/keyword/type": {
                    [`${schemaUri}#/properties/foo/type`]: { valid: false, value: "string" }
                  }
                }
              }
            ]
          }
        },
        "https://json-schema.org/keyword/required": {
          [`${schemaUri}#/required`]: { valid: false, value: ["foo", "bar"] }
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
      "#": {
        "https://json-schema.org/keyword/properties": {
          [`${schemaUri}#/properties`]: {
            valid: false,
            value: { foo: `${schemaUri}#/properties/foo` },
            outputs: [
              {
                "#/foo": {
                  "https://json-schema.org/keyword/properties": {
                    [`${schemaUri}#/properties/foo/properties`]: {
                      valid: false,
                      value: { bar: `${schemaUri}#/properties/foo/properties/bar` },
                      outputs: [
                        {
                          "#/foo/bar": {
                            "https://json-schema.org/keyword/type": {
                              [`${schemaUri}#/properties/foo/properties/bar/type`]: { valid: false, value: "boolean" }
                            }
                          }
                        }
                      ]
                    }
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
