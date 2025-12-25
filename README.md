# Hyperjump - JSON Schema Errors

JSON Schema validator error messages are often difficult to interpret,
especially when working with complex or poorly structured schemas. This package
consumes the standard error output produced by JSON Schema validators and
converts it into clear, human-friendly messages, making it easier for users to
understand validation failures and how to fix them.

## Installation

This module is designed for node.js (ES Modules, TypeScript) and browsers. It
should work in Bun and Deno as well, but the test runner doesn't work in these
environments, so this module may be less stable in those environments.

```bash
npm install @hyperjump/json-schema-errors
```

## Usage

`@hyperjump/json-schema-errors` works with any JSON Schema validator that
follows the official [JSON Schema Output
Format](https://json-schema.org/draft/2020-12/json-schema-core#name-output-structure).
In this example, we’ll showcase it with the
[@hyperjump/json-schema](https://github.com/hyperjump-io/json-schema) validator.

`@hyperjump/json-schema-errors` uses the output from the validator, the
schema(s) used to validate the JSON instance, and the JSON instance to build its
results. Because it uses the schema, even if you didn't do your validation with
`@hyperjump/json-schema`, you still need to register your schemas with that
package in order for this package to do its job.

```TypeScript
import { registerSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { BASIC } from "@hyperjump/json-schema/experimental";
import { getErrors } from "@hyperjump/json-schema-errors";

const schemaUri = "https://example.com/schema/string";
registerSchema({
  $schema: "https://json-schema.org/draft/2020-12/schema",

  type: "string"
});

const instance = 42;
const output = await validate(schemaUri, instance, BASIC);
const errors = await jsonSchemaErrors(output, schemaUri, instance);
console.log(errors);
// [
//   {
//     message: "Expected a string",
//     instanceLocation: "#",
//     schemaLocations: ["https://example.com/main#/type"]
//   }
// ]
```

If using this package with the results from another validator, you still need to
register the schema. Here's an example using `@cfworker/json-schema`.

```TypeScript
import { jsonSchemaErrors } from "@hyperjump/json-schema-errors";
import { registerSchema } from "@hyperjump/json-schema/draft-2020-12";
import { Validator } from "@cfworker/json-schema";
import type { Schema } from "@cfworker/json-schema";

const schemaUri = "https://example.com/main";

/** @type Schema */
const schema: Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "string"
};
const validator = new Validator(schema);

const instance = 42;
const output = validator.validate(instance);

registerSchema(schema, schemaUri);
const errors = await jsonSchemaErrors(output, schemaUri, instance);
console.log(errors);
// [
//   {
//     message: "Expected a string",
//     instanceLocation: "#",
//     schemaLocations: ["https://example.com/main#/type"]
//   }
// ]
```

## API

https://json-schema-errors.hyperjump.io

## Examples

This package has some unique features to help focus error messaging to be more
helpful. In this section we list some examples showing those features.

## Contributing

Contributions are welcome! Please create an issue to propose and discuss any
changes you'd like to make before implementing it. If it's an obvious bug with
an obvious solution or something simple like a fixing a typo, creating an issue
isn't required. You can just send a PR without creating an issue. Before
submitting any code, please remember to run all of the following scripts.

- npm test (Tests can also be run continuously using npm test -- --watch)
- npm run lint
- npm run type-check
