# JSON Schema Errors Test Suite

This test suite is designed to allow the tests to be run in a variety of
different contexts. It can be used to test the package against a variety of
dialects. It can be used to test translations. Most interestingly, it can be
used by JSON Schema implementations to check their compatibility with this
package. The test runner included here tests compatibility with
`@hyperjump/json-schema`.

## `compatibility`

Schemas in this test suite don't include `$schema` or `$id`/`id` keywords so
they can be run for a variety of dialects. The `compatibility` property allows
you to set which dialects the test is compatible with. Dialects are indicated by
the number corresponding to their release. Date-based releases use just the
year. If this option isn't present, it means the Test Case is compatible with
all dialects since draft-04.

If this option is present with a number, the number indicates the minimum
release the test is compatible with. This example indicates that the test is
compatible with draft-07 and up.

**Example**: `"compatibility": "7"`

You can use a `<=` operator to indicate that the test is compatible with
releases less then or equal to the given release. This example indicates that
the test is compatible with 2019-09 and under.

**Example**: `"compatibility": "<=2019"`

You can use comma-separated values to indicate multiple constraints if needed.
This example indicates that the test is compatible with releases between
draft-06 and 2019-09.

**Example**: `"compatibility": "6,<=2019"`

For convenience, you can use the `=` operator to indicate a test is only
compatible with a single release. This example indicates that the test is
compatible only with 2020-12.

**Example**: `"compatibility": "=2020"`

## `errors`/`errorsWithFullResults`

Validators differ in how much information their output includes. Most only
report errors, so it isn't possible to know what happened inside an applicator
that passed. For example, the output usually doesn't say which `anyOf`
alternative matched. The more information that's available, the more specific
the messages can be.

`errors` are the expected errors when the output only includes errors.
`errorsWithFullResults` are the expected errors when the results of every
keyword are known, including those that passed. If `errorsWithFullResults`
isn't present, it's not tested.

## `messageId`/`messageParams`

The `messageId` and `messageParams` properties correspond to the identifiers and
parameters in the translations .ftl files.

Some of the message parameters take a list combined using "or". For example,
"Expected a string, number, or boolean". To express that in the message
parameters, you would use `{ "or": ["string", "number", "boolean"]}`. The test
runner should combine those using an "or" appropriate for the language under
test.
