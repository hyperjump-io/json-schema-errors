export default `
// Any type keywords
boolean-schema-message = A value is not allowed here
type-message = Expected a {$expectedTypes}
const-message = Expected exactly {$expected}
const-success-message = The value is exactly {$expected}
const-negated-message = The value is not {$expected}
enum-message = Expected one of {$expected}
enum-success-message = The value is one of {$expected}
enum-negated-message = The value is not one of {$expected}
format-message = Expected a value matching the '{$format}' format
format-success-message = The value is either not a string or matches the '{$format}' format (if formats are validated)
format-negated-message = The value is a string that doesn't match the '{$format}' format (if formats are validated)
unknown-message = Validation failed for '{$keyword}'
type-success-message = The value is {$count ->
  [one] {$type ->
    [null] null
    [array] an array
    [object] an object
    [integer] an integer
   *[other] a {$type}
  }
 *[other] of type {$types}
}
type-negated-message = The value is not {$count ->
  [one] {$type ->
    [null] null
    [array] an array
    [object] an object
    [integer] an integer
   *[other] a {$type}
  }
 *[other] of type {$types}
}
}

// Number keywords
exclusiveMaximum-message = Expected a number less than {$exclusiveMaximum}
exclusiveMaximum-success-message = The value is either not a number or is less than {$exclusiveMaximum}
exclusiveMaximum-negated-message = The value is a number greater than or equal to {$exclusiveMaximum}
exclusiveMinimum-message = Expected a number greater than {$exclusiveMinimum}
exclusiveMinimum-success-message = The value is either not a number or is greater than {$exclusiveMinimum}
exclusiveMinimum-negated-message = The value is a number less than or equal to {$exclusiveMinimum}
maximum-message = Expected a number less than or equal to {$maximum}
maximum-success-message = The value is either not a number or is less than or equal to {$maximum}
maximum-negated-message = The value is a number greater than {$maximum}
minimum-message = Expected a number greater than or equal to {$minimum}
minimum-success-message = The value is either not a number or is greater than or equal to {$minimum}
minimum-negated-message = The value is a number less than {$minimum}
multipleOf-message = Expected a number that is a multiple of {$multipleOf}
multipleOf-success-message = The value is either not a number or is a multiple of {$multipleOf}
multipleOf-negated-message = The value is a number that is not a multiple of {$multipleOf}

// String keywords
maxLength-message = Expected a string with no more than {$maxLength} characters
maxLength-success-message = The value is either not a string or has no more than {$maxLength ->
  [one] one character
 *[other] {$maxLength} characters
}
maxLength-negated-message = The value is a string with more than {$maxLength ->
  [one] one character
 *[other] {$maxLength} characters
}
minLength-message = Expected a string with at least {$minLength} characters
minLength-success-message = The value is either not a string or has at least {$minLength ->
  [one] one character
 *[other] {$minLength} characters
}
minLength-negated-message = The value is a string with fewer than {$minLength ->
  [one] one character
 *[other] {$minLength} characters
}
pattern-message = Expected a string matching the regular expression /{$pattern}/
pattern-success-message = The value is either not a string or matches the regular expression /{$pattern}/
pattern-negated-message = The value is a string that doesn't match the regular expression /{$pattern}/

// Array keywords
eachItem-success-message = {$index ->
  [0] Each item satisfies the following
 *[other] Each item at index {$index} or later satisfies the following
}
eachItem-negated-message = {$index ->
  [0] There is an item where at least one of the following is true
 *[other] There is an item at index {$index} or later where at least one of the following is true
}
hasItem-success-message = The value is an array with an item at index {$index}
hasItem-negated-message = The value is either not an array or doesn't have an item at index {$index}
maxItems-message = Expected an array with no more than {$maxItems} items
maxItems-success-message = The value is either not an array or has no more than {$maxItems ->
  [one] one item
 *[other] {$maxItems} items
}
maxItems-negated-message = The value is an array with more than {$maxItems ->
  [one] one item
 *[other] {$maxItems} items
}
minItems-message = Expected an array with at least {$minItems} items
minItems-success-message = The value is either not an array or has at least {$minItems ->
  [one] one item
 *[other] {$minItems} items
}
minItems-negated-message = The value is an array with fewer than {$minItems ->
  [one] one item
 *[other] {$minItems} items
}
contains-message = Expected the array to contain {$minContains ->
  [1] at least one item
 *[other] at least {$minContains} items
} like the following
contains-range-message = Expected the array to contain between {$minContains} and {$maxContains} items like the following
contains-exact-message = Expected the array to contain {$minContains ->
  [1] exactly one item
 *[other] exactly {$minContains} items
} like the following
contains-schema-message = Expected an array that contains {$minContains ->
  [1] at least one item matching
 *[other] at least {$minContains} items matching
} the 'contains' schema
contains-schema-range-message = Expected an array containing between {$minContains} and {$maxContains} items matching the 'contains' schema
contains-schema-exact-message = Expected an array containing {$minContains ->
  [1] exactly one item matching
 *[other] exactly {$minContains} items matching
} the 'contains' schema
contains-too-many-message = Expected {$maxContains ->
  [0] no items
  [one] no more than one item
 *[other] no more than {$maxContains} items
} in the array to be like the following
uniqueItems-message = Array items must be unique
uniqueItems-success-message = The value is either not an array or has no duplicate items
uniqueItems-negated-message = The value is an array with duplicate items

// Object keywords
maxProperties-message = Expected an object with no more than {$maxProperties} properties
maxProperties-success-message = The value is either not an object or has no more than {$maxProperties ->
  [one] one property
 *[other] {$maxProperties} properties
}
maxProperties-negated-message = The value is an object with more than {$maxProperties ->
  [one] one property
 *[other] {$maxProperties} properties
}
minProperties-message = Expected an object with at least {$minProperties} properties
minProperties-success-message = The value is either not an object or has at least {$minProperties ->
  [one] one property
 *[other] {$minProperties} properties
}
minProperties-negated-message = The value is an object with fewer than {$minProperties ->
  [one] one property
 *[other] {$minProperties} properties
}
eachMatchingProperty-success-message = Each property whose name matches the regular expression /{$pattern}/ satisfies the following
eachMatchingProperty-negated-message = There is a property whose name matches the regular expression /{$pattern}/ where at least one of the following is true
noMatchingProperty-success-message = The value is either not an object or has no properties whose names match the regular expression /{$pattern}/
noMatchingProperty-negated-message = The value is an object with a property whose name matches the regular expression /{$pattern}/
eachAdditionalProperty-success-message = {$scope ->
  [names] Each property other than {$properties} satisfies the following
  [patterns] Each property whose name doesn't match {$patterns} satisfies the following
  [both] Each property other than {$properties} whose name doesn't match {$patterns} satisfies the following
 *[all] Each property satisfies the following
}
eachAdditionalProperty-negated-message = {$scope ->
  [names] There is a property other than {$properties} where at least one of the following is true
  [patterns] There is a property whose name doesn't match {$patterns} where at least one of the following is true
  [both] There is a property other than {$properties} whose name doesn't match {$patterns} where at least one of the following is true
 *[all] There is a property where at least one of the following is true
}
noAdditionalProperty-success-message = {$scope ->
  [names] The value is either not an object or has no properties other than {$properties}
  [patterns] The value is either not an object or has no properties whose names don't match {$patterns}
  [both] The value is either not an object or has no properties other than {$properties} whose names don't match {$patterns}
 *[all] The value is either not an object or has no properties
}
noAdditionalProperty-negated-message = {$scope ->
  [names] The value is an object with a property other than {$properties}
  [patterns] The value is an object with a property whose name doesn't match {$patterns}
  [both] The value is an object with a property other than {$properties} whose name doesn't match {$patterns}
 *[all] The value is an object with at least one property
}
eachPropertyName-success-message = Each property name satisfies the following
eachPropertyName-negated-message = There is a property name where at least one of the following is true
required-message = Missing required {$count ->
  [one] property: {$required}
 *[other] properties: {$required}
}
required-success-message = The value is either not an object or has {$count ->
  [one] property: {$required}
 *[other] properties: {$required}
}
required-negated-message = The value is an object missing {$count ->
  [one] property: {$required}
 *[other] at least one of the properties: {$required}
}
hasProperty-success-message = The value is an object with {$count ->
  [one] property: {$properties}
 *[other] at least one of the properties: {$properties}
}
hasProperty-negated-message = The value is either not an object or {$count ->
  [one] doesn't have property: {$properties}
 *[other] has none of the properties: {$properties}
}
dependentRequired-success-message = The value is either not an object or has {$count ->
  [one] property: {$required}
 *[other] properties: {$required}
} when it has property: {$property}
dependentRequired-negated-message = The value is an object that has property: {$property} but is missing {$count ->
  [one] property: {$required}
 *[other] at least one of the properties: {$required}
}

// Applicators
anyOf-message = Expected the value to satisfy at least one of the following options
oneOf-message = Expected the value to satisfy exactly one of the following options
oneOf-multiple-matches-message = Expected the value to satisfy only one of the following options
oneOf-too-many-message = Expected the value to satisfy only one option, but it satisfies more than one
not-message = Expected {$quantifier ->
  [one] the following
  [all] all of the following
 *[some] at least one of the following
} to be true

// Success messages that don't belong to a keyword
any-value-message = Any value is allowed

// Groups of success messages
count-true-message = {$kind ->
  [exactly] Exactly {$min ->
    [one] one of the following is
   *[other] {$min} of the following are
  } true
  [atMost] {$max ->
    [0] None of the following are true
    [one] No more than one of the following is true
   *[other] No more than {$max} of the following are true
  }
  [between] Between {$min} and {$max} of the following are true
 *[atLeast] At least {$min ->
    [one] one of the following is
   *[other] {$min} of the following are
  } true
}
all-true-message = All of the following are true
`;
