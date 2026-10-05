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

With `@hyperjump/json-schema`, you can also get error messages directly from
validation. Importing this package adds a `JSE` output format to
`@hyperjump/json-schema`. It uses the full results of evaluation rather than
only what the standard output formats report. Use the `locale` option to choose
the language of the messages. The default is `en-US`, which is currently the
only locale included. See [Messages and Translations](#messages-and-translations)
to add a locale.

```TypeScript
import { registerSchema, validate } from "@hyperjump/json-schema/draft-2020-12";
import { JSE } from "@hyperjump/json-schema-errors";

const schemaUri = "https://example.com/schema/string";
registerSchema({
  $schema: "https://json-schema.org/draft/2020-12/schema",

  type: "string"
});

const output = await validate(schemaUri, 42, { outputFormat: JSE, locale: "en-US" });
console.log(output);
// {
//   valid: false,
//   errors: [
//     {
//       message: "Expected a string",
//       instanceLocation: "#",
//       schemaLocations: ["https://example.com/schema/string#/type"]
//     }
//   ]
// }
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

Validators often only validate the `format` keyword if they're configured to.
Use the `isFormatAsserted` option to say whether the validator validated
formats. If it isn't given, messages that describe `format` say that it only
applies if formats are validated. The `JSE` output format works this out from
`@hyperjump/json-schema`'s configuration and each dialect's default.

```TypeScript
const errors = await jsonSchemaErrors(output, schemaUri, instance, { isFormatAsserted: true });
```

## Messages and Translations

Messages are written in [Fluent](https://projectfluent.org/). Use
`addTranslation` to add a locale or to change messages. A message with the
same id as an existing message replaces it, and messages that aren't translated
for a locale fall back to `en-US`. See
[`src/translations/en-US.js`](src/translations/en-US.js) for the message ids
and the variables each message gets.

```TypeScript
import { addTranslation } from "@hyperjump/json-schema-errors";

// Change a message
addTranslation("en-US", `
required-message = Missing {$count ->
  [one] the required property {$required}
 *[other] the required properties {$required}
}
`);

// Add a locale. Use the direction option for right-to-left languages.
addTranslation("fr-FR", `
type-message = Une valeur de type {$expectedTypes} est attendue
`);
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
the value of `startsWith`. The keyword itself needs to be defined with
`@hyperjump/json-schema`'s `addKeyword` and included in a dialect.

Messages for a keyword use the ids `{keyword}-message` for errors and
`{keyword}-success-message` and `{keyword}-negated-message` for describing what
the keyword requires.

```TypeScript
import { addTranslation } from "@hyperjump/json-schema-errors";

addTranslation("en-US", `
startsWith-message = Expected a string that starts with '{$prefix}'
startsWith-success-message = The value is either not a string or starts with '{$prefix}'
startsWith-negated-message = The value is a string that doesn't start with '{$prefix}'
`);
```

Every keyword needs a normalization handler. Keywords that aren't applicators
don't have anything to evaluate.

```TypeScript
import { setNormalizationHandler } from "@hyperjump/json-schema-errors";

const KEYWORD_URI = "https://example.com/keyword/startsWith";

setNormalizationHandler(KEYWORD_URI, {
  evaluate() {
    // Only applicator keywords need to return a value
  }
});
```

An error handler turns the normalized results into messages. It's registered
with a URI that identifies the handler. A handler can handle any number of
keywords, so it gets the results of every keyword that applies to a location in
the instance and picks out the ones it handles.

`error` describes keywords that failed. A result's `valid` is `false` if the
keyword failed, `true` if it passed, and `undefined` if the result isn't known.

`success` describes what keywords require. It's used to explain failures caused
by a subschema passing, such as with `not`. In a negated context, it describes
what would make the keyword fail instead. `context.localization.formatRequirement`
picks the success or negated message. A keyword without a `success` handler
can't be described, so messages for keywords like `not` and `oneOf` will be less
specific.

```TypeScript
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { getCompiledKeywordValue, setErrorHandler } from "@hyperjump/json-schema-errors";
import type { ErrorObject } from "@hyperjump/json-schema-errors";

const KEYWORD_URI = "https://example.com/keyword/startsWith";

setErrorHandler("https://example.com/error-handler/startsWith", {
  error: (normalizedErrors, instance, context) => {
    const errors: ErrorObject[] = [];

    for (const schemaLocation in normalizedErrors[KEYWORD_URI]) {
      if (normalizedErrors[KEYWORD_URI][schemaLocation].valid !== false) {
        continue;
      }

      const prefix = getCompiledKeywordValue(context.ast, schemaLocation) as string;
      errors.push({
        message: context.localization.format("startsWith-message", { prefix }),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return errors;
  },

  success: (normalizedOutput, instance, context) => {
    const successes: ErrorObject[] = [];

    for (const schemaLocation in normalizedOutput[KEYWORD_URI]) {
      const prefix = getCompiledKeywordValue(context.ast, schemaLocation) as string;
      successes.push({
        message: context.localization.formatRequirement("startsWith", { prefix }),
        instanceLocation: Instance.uri(instance),
        schemaLocations: [schemaLocation]
      });
    }

    return successes;
  }
});
```

Simple applicator keywords that just evaluate subschemas and don't make any
assertions of their own don't need an error handler, only a normalization
handler. Whether a keyword is a simple applicator comes from the
`simpleApplicator` property of its `@hyperjump/json-schema` keyword definition.
The results of its subschemas are flattened into the results of the parent
schema before they're passed to error handlers.
For example, support for the `allOf` keyword could look like the following.

```TypeScript
import { setNormalizationHandler, evaluateSchema } from "@hyperjump/json-schema-errors";

const KEYWORD_URI = "https://json-schema.org/keyword/allOf";

setNormalizationHandler(KEYWORD_URI, {
  evaluate(allOf, instance, context) {
    return allOf.map((schemaLocation) => evaluateSchema(schemaLocation, instance, context));
  }
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
