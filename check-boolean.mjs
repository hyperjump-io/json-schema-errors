import { registerSchema } from "@hyperjump/json-schema/draft-2020-12";
import { betterJsonSchemaErrors } from "./src/index.js";

const schemaUri = "https://example.com/main";
registerSchema({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  properties: { foo: false }
}, schemaUri);

const output = {
  valid: false,
  errors: [
    { absoluteKeywordLocation: `${schemaUri}#/properties/foo`, instanceLocation: "#/foo" }
  ]
};

const instance = { foo: 42 };

const result = await betterJsonSchemaErrors(output, schemaUri, instance);
console.log(JSON.stringify(result, null, 2));