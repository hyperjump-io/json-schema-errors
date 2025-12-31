# Non-type specific messages
type-error = The instance should be of type {$expected} but found {$actual}.
conflicting-message = Conflicting types found. A JSON value can't be more than one type at a time.
const-error = The instance should be equal to {$expectedValue}.
enum-error-suggestion = Unexpected value {$instanceValue}. Did you mean {$suggestion}?
enum-error-types-values = Unexpected value {$instanceValue}. { $variant ->
  [types] Expected a {$expectedTypes}.
  [values] Expected one of: {$allowedValues}.
  *[both] Expected a type of {$expectedTypes}, or one of: {$allowedValues}.
}
enum-error-strings-range = The string must be at least {$minLength} or at most {$maxLength} characters.
enum-error-strings-range-pattern = The string must match the pattern {$pattern} or be at most {$maxLength} characters.
enum-error-strings-pattern-and-range = The string must match the pattern {$pattern} or have at most {$maxLength} characters or be at least {$minLength} characters.

# Schema Descriptions
null-description = a null.
boolean-description = a boolean.
number-description = a number {$constraints}
string-description = a string {$constraints}.
array-description = an array {$constraints}
tuple-description = a tuple with {$numItems} items.
object-description = an object {$constraints}

# String messages
string-error = Expected a string {$constraints}.
string-error-minLength = at least {$minLength} characters long
string-error-maxLength = at most {$maxLength} characters long
string-error-pattern = that matches the pattern: {$pattern}.
pattern-error = The instance should match the pattern: {$pattern}.
format-error = The instance should match the format: {$format}.

# Number messages
number-error = Expected a number {$constraints}.
number-error-minimum = greater than {$minimum}
number-error-exclusive-minimum = greater than or equal to {$minimum}
number-error-maximum = less than {$maximum}
number-error-exclusive-maximum = less than or equal to {$maximum}
number-error-multiple-of = multiple of {$multipleOf}.
multiple-of-error = The instance should be a multiple of {$divisor}.

# Object messages
properties-error = Expected object to have {$constraints}
properties-error-max = at most {$maxProperties} properties.
properties-error-min = at least {$minProperties} properties.
required-error = This instance is missing required property(s): {$missingProperties}.
additional-properties-error = The property "{$propertyName}" is not allowed.

# Array messages
array-error = Expected the array to have {$constraints}.
array-error-min = at least {$minItems} items
array-error-max = at most {$maxItems} items
unique-items-error = The instance should have unique items in the array.
contains-error-min = The array must contain at least {$minContains -> 
  [one] item that passes
	*[other] items that pass
} the 'contains' schema.
contains-error-min-max = The array must contain at least {$minContains} and at most {$maxContains ->
  [one] item that passes
	*[other] items that pass
} the 'contains' schema.

# Conditional messages
anyOf-error = The instance must pass at least one of the given schemas.
anyOf-error-bullets = The value must be either of {$constraints}
not-error = The instance is not allowed to be used in this schema.

# Generic boolean-schema failure message (used when a schema is simply `false`)
boolean-schema-error = The instance is not allowed by the schema.