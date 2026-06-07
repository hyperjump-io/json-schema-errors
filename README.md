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
import { jsonSchemaErrors } from "@hyperjump/json-schema-errors";

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

## Custom Keywords and Error Handlers

`@hyperjump/json-schema-errors` uses a two phase process. In order to support a
custom keyword we'll need to register a handler for each phase of the process.

1. **Normalization**: This phase takes the raw error output from the validator
   and converts it to a `NormalizedOutput`.

2. **Error Handling**: This phase takes the `NormalizedOutput` and uses it to
   generate the error messages that will be presented to the user.

Here's an example of adding support for a simple keyword called `startsWith`.
`startsWith` takes a string and asserts that a string JSON instance starts with
the value of `startsWith`.

```TypeScript
import { setNormalizationHandler, addErrorHandler } from "@hyperjump/json-schema-errors";
import { getSchema } from "@hyperjump/json-schema/experimental";
import * as Schema from "@hyperjump/browser";
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import type { ErrorObject } from "@hyperjump/json-schema-errors";

const KEYWORD_URI = "https://example.com/keyword/startsWith";

setNormalizationHandler(KEYWORD_URI, {
  evaluate() {
    // Only applicator keywords need to return a value
  }
});

addErrorHandler(async (normalizedErrors, instance, localization) => {
  const errors: ErrorObject = [];

  for (const schemaLocation in normalizedErrors[KEYWORD_URI]) {
    if (normalizedErrors[KEYWORD_URI][schemaLocation]) {
      continue;
    }

    const keyword = await getSchema(schemaLocation);
    const startsWith = Schema.value(keyword) as string;

    errors.push({
      message: "Expected a string that starts with '${startsWith}'",
      instanceLocation: Instance.uri(instance),
      schemaLocations: [schemaLocation]
    });
  }

  return errors;
});
```

Simple applicator keywords that just evaluate subschemas and don't make any
assertions of their own don't need an error handler, only a normalization
handler. For example, support for the `allOf` keyword could look like the
following.

```TypeScript
import { setNormalizationHandler, evaluateSchema } from "@hyperjump/json-schema-errors";

const KEYWORD_URI = "https://json-schema.org/keyword/allOf";

setNormalizationHandler(KEYWORD_URI, {
  evaluate(allOf, instance, context) {
    return allOf.map((schemaLocation) => evaluateSchema(schemaLocation, instance, context));
  },
  simpleApplicator: true
});
```

See the `anyOf` or `oneOf` normalization and error handlers for an example of
implementing an applicator that also asserts.

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
