// Any type keywords
boolean-schema-error = A value is not allowed here
type-error = Expected a {$expectedTypes}
const-error = Expected {$expected}
enum-error = Expected {$expected}
format-error = Expected a value matching the '{$format}' format

// Number keywords
exclusiveMaximum-error = Expected a number less than {$exclusiveMaximum}
exclusiveMinimum-error = Expected a number greater than {$exclusiveMinimum}
maximum-error = Expected a number less than {$maximum}
minimum-error = Expected a number greater than {$minimum}
multipleOf-error = Expected a number that is a multiple of {$multipleOf}

// String keywords
maxLength-error = Expected a string with at most {$maxLength} characters
minLength-error = Expected a string with at least {$minLength} characters
pattern-error = Expected a string matching the regular expression /{$pattern}/

// Array keywords
maxItems-error = Expected an array with at most {$maxItems} items
minItems-error = Expected an array with at least {$minItems} items
uniqueItems-error = Duplicated item

// Object keywords
maxProperties-error = Expected an object with at most {$maxProperties} properties
minProperties-error = Expected an object with at least {$minProperties} properties
required-error = Required {$count ->
  [one] property {$required} is
 *[other] properties {$required} are
} missing

// Applicators
anyOf-error = None of the alternatives match
