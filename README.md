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

## Custom Keywords

A custom keyword needs to be defined with `@hyperjump/json-schema`'s
`addKeyword` and included in a dialect. Then use `defineKeyword` to add messages
for it. Here's an example for a keyword called `startsWith` that asserts that a
string starts with the keyword's value.

Messages for a keyword use the ids `{keyword}-message` for errors and
`{keyword}-success-message` and `{keyword}-negated-message` for describing what
the keyword requires.

```TypeScript
import { addTranslation, defineKeyword } from "@hyperjump/json-schema-errors";

addTranslation("en-US", `
startsWith-message = Expected a string that starts with '{$prefix}'
startsWith-success-message = The value is either not a string or starts with '{$prefix}'
startsWith-negated-message = The value is a string that doesn't start with '{$prefix}'
`);

defineKeyword<string>("https://example.com/keyword/startsWith", {
  error: (prefix, localization) => localization.format("startsWith-message", { prefix }),
  requirement: (prefix, localization) => localization.formatRequirement("startsWith", { prefix })
});
```

`error` is the message for each occurrence of the keyword that failed. It gets
the keyword's value as compiled by its `@hyperjump/json-schema` definition and
the value that failed.

`requirement` describes what the keyword requires. It's used to explain failures
caused by a subschema passing, such as with `not`. Then, it describes what would
make the keyword fail instead, so `formatRequirement` picks the success or
negated message. A keyword without a `requirement` can't be described, so
messages for keywords like `not` and `oneOf` will be less specific.

Keywords that are only annotations, like `title`, never fail and don't require
anything.

```TypeScript
defineKeyword("https://example.com/keyword/note", { annotation: true });
```

Simple applicator keywords that just evaluate subschemas and don't make any
assertions of their own only need to evaluate their subschemas. Whether a
keyword is a simple applicator comes from the `simpleApplicator` property of its
`@hyperjump/json-schema` keyword definition. The results of its subschemas are
treated as results of the parent schema. For example, support for the `allOf`
keyword could look like the following.

```TypeScript
import { defineKeyword, evaluateSchema } from "@hyperjump/json-schema-errors";

defineKeyword<string[]>("https://json-schema.org/keyword/allOf", {
  evaluate(allOf, instance, context) {
    return allOf.map((schemaLocation) => evaluateSchema(schemaLocation, instance, context));
  }
});
```

### Error Handlers

Some keywords need more control over their messages, such as a keyword that
combines its occurrences into one message, keywords that are described together,
or an applicator that makes assertions of their own. These keywords are still
defined with `defineKeyword`, but without `error` or `requirement`. Their
messages come from an error handler instead.

An error handler, set with `setErrorHandler`, builds messages from the
`NormalizedOutput` of a schema. A handler can handle any number of keywords, so
it gets the results of every keyword that applies to a location in the instance
and picks out the ones it handles. A result's `valid` is `false` if the keyword
failed, `true` if it passed, and `undefined` if the result isn't known. Its
`value` is the keyword's compiled value. `error` describes keywords that failed
and `success` describes what keywords require. In a negated context, `success`
describes what would make the keywords fail instead.

The `startsWith` keyword from the previous section could also be written with an
error handler.

```TypeScript
import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { defineKeyword, setErrorHandler } from "@hyperjump/json-schema-errors";
import type { ErrorObject } from "@hyperjump/json-schema-errors";

const KEYWORD_URI = "https://example.com/keyword/startsWith";

defineKeyword(KEYWORD_URI, {});

setErrorHandler("https://example.com/error-handler/startsWith", {
  error: (normalizedErrors, instance, context) => {
    const errors: ErrorObject[] = [];

    for (const schemaLocation in normalizedErrors[KEYWORD_URI]) {
      const { valid, value } = normalizedErrors[KEYWORD_URI][schemaLocation];
      if (valid !== false) {
        continue;
      }

      const prefix = value as string;
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
      const prefix = normalizedOutput[KEYWORD_URI][schemaLocation].value as string;
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

Applicators that make assertions of their own, like `not` or `anyOf`, need an
error handler that describes their subschemas. A keyword result's `outputs` has
the normalized output of each subschema. These functions help describe them.

- `getErrors` and `getSuccesses` describe a subschema's errors or what it
  requires. `getSuccesses` can describe a subschema the validator didn't
  evaluate from its schema location.
- `negate` gives a context that describes what would make a subschema fail
  instead of what it requires.
- `getValidity` says whether a subschema passed, failed, or if it isn't known.
- `someTrue`, `allTrue`, and `countTrue` group descriptions of subschemas, such
  as when at least one of them needs to be true.
- `getPlaceholder`, `isPlaceholder`, `describeConditional`, and `describeScope`
  describe values that aren't present, such as a property that would only need
  to match a subschema if it were present.

Long lists of messages are shortened automatically. See the `not`, `anyOf`, and
`properties` error handlers for examples.

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
