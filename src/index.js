import { defineKeyword, setErrorHandler } from "./json-schema-errors.js";

// Keywords
import additionalItemsKeyword from "./keywords/draft-04/additionalItems.js";
import additionalPropertiesKeyword from "./keywords/additionalProperties.js";
import allOfKeyword from "./keywords/allOf.js";
import anyOfKeyword from "./keywords/anyOf.js";
import containsKeyword from "./keywords/contains.js";
import containsDraft06Keyword from "./keywords/draft-06/contains.js";
import dependenciesKeyword from "./keywords/draft-04/dependencies.js";
import dependentSchemasKeyword from "./keywords/dependentSchemas.js";
import dynamicRefKeyword from "./keywords/dynamicRef.js";
import elseKeyword from "./keywords/else.js";
import ifKeyword from "./keywords/if.js";
import itemsDraft04Keyword from "./keywords/draft-04/items.js";
import itemsKeyword from "./keywords/items.js";
import notKeyword from "./keywords/not.js";
import oneOfKeyword from "./keywords/oneOf.js";
import patternKeyword from "./keywords/pattern.js";
import patternPropertiesKeyword from "./keywords/patternProperties.js";
import prefixItemsKeyword from "./keywords/prefixItems.js";
import propertiesKeyword from "./keywords/properties.js";
import propertyNamesKeyword from "./keywords/propertyNames.js";
import refKeyword from "./keywords/ref.js";
import thenKeyword from "./keywords/then.js";
import unevaluatedItemsKeyword from "./keywords/unevaluatedItems.js";
import unevaluatedPropertiesKeyword from "./keywords/unevaluatedProperties.js";

// Error Handlers
import anyOfErrorHandler from "./error-handlers/anyOf.js";
import booleanSchemaErrorHandler from "./error-handlers/boolean-schema.js";
import containsErrorHandler from "./error-handlers/contains.js";
import dependenciesErrorHandler from "./error-handlers/draft-04/dependencies.js";
import dependentSchemasErrorHandler from "./error-handlers/dependentSchemas.js";
import eachPropertyErrorHandler from "./error-handlers/eachProperty.js";
import formatErrorHandler from "./error-handlers/format.js";
import ifThenElseErrorHandler from "./error-handlers/ifThenElse.js";
import itemsErrorHandler from "./error-handlers/items.js";
import maximumErrorHandler from "./error-handlers/maximum.js";
import maxItemsErrorHandler from "./error-handlers/maxItems.js";
import maxLengthErrorHandler from "./error-handlers/maxLength.js";
import maxPropertiesErrorHandler from "./error-handlers/maxProperties.js";
import minimumErrorHandler from "./error-handlers/minimum.js";
import minItemsErrorHandler from "./error-handlers/minItems.js";
import minLengthErrorHandler from "./error-handlers/minLength.js";
import minPropertiesErrorHandler from "./error-handlers/minProperties.js";
import multipleOfErrorHandler from "./error-handlers/multipleOf.js";
import notErrorHandler from "./error-handlers/not.js";
import oneOfErrorHandler from "./error-handlers/oneOf.js";
import prefixItemsErrorHandler from "./error-handlers/prefixItems.js";
import propertiesErrorHandler from "./error-handlers/properties.js";
import requiredErrorHandler from "./error-handlers/required.js";
import typeConstEnumErrorHandler from "./error-handlers/typeConstEnum.js";
import uniqueItemsErrorHandler from "./error-handlers/uniqueItems.js";
import unknownErrorHandler from "./error-handlers/unknown.js";

// Registration order determines message order. Type comes first because it's the
// most fundamental thing to know about a value. Keywords with their own messages
// are defined after the error handlers, so their messages come last.
setErrorHandler("https://hyperjump.io/error-handler/typeConstEnum", typeConstEnumErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/anyOf", anyOfErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/boolean-schema", booleanSchemaErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/contains", containsErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/dependencies", dependenciesErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/dependentSchemas", dependentSchemasErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/eachProperty", eachPropertyErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/format", formatErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/ifThenElse", ifThenElseErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/items", itemsErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/maximum", maximumErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/maxItems", maxItemsErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/maxLength", maxLengthErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/maxProperties", maxPropertiesErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/minimum", minimumErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/minItems", minItemsErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/minLength", minLengthErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/minProperties", minPropertiesErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/multipleOf", multipleOfErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/not", notErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/oneOf", oneOfErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/prefixItems", prefixItemsErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/properties", propertiesErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/required", requiredErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/uniqueItems", uniqueItemsErrorHandler);
setErrorHandler("https://hyperjump.io/error-handler/unknown", unknownErrorHandler);

defineKeyword("https://json-schema.org/keyword/draft-04/additionalItems", additionalItemsKeyword);
defineKeyword("https://json-schema.org/keyword/additionalProperties", additionalPropertiesKeyword);
defineKeyword("https://json-schema.org/keyword/allOf", allOfKeyword);
defineKeyword("https://json-schema.org/keyword/anyOf", anyOfKeyword);
defineKeyword("https://json-schema.org/keyword/comment", { annotation: true });
defineKeyword("https://json-schema.org/keyword/const", {});
defineKeyword("https://json-schema.org/keyword/contains", containsKeyword);
defineKeyword("https://json-schema.org/keyword/draft-06/contains", containsDraft06Keyword);
defineKeyword("https://json-schema.org/keyword/default", { annotation: true });
defineKeyword("https://json-schema.org/keyword/definitions", { annotation: true });
defineKeyword("https://json-schema.org/keyword/draft-04/dependencies", dependenciesKeyword);
defineKeyword("https://json-schema.org/keyword/dependentRequired", {});
defineKeyword("https://json-schema.org/keyword/dependentSchemas", dependentSchemasKeyword);
defineKeyword("https://json-schema.org/keyword/deprecated", { annotation: true });
defineKeyword("https://json-schema.org/keyword/description", { annotation: true });
defineKeyword("https://json-schema.org/keyword/draft-2020-12/dynamicRef", dynamicRefKeyword);
defineKeyword("https://json-schema.org/keyword/else", elseKeyword);
defineKeyword("https://json-schema.org/keyword/enum", {});
defineKeyword("https://json-schema.org/keyword/examples", { annotation: true });
defineKeyword("https://json-schema.org/keyword/format", {});
defineKeyword("https://json-schema.org/keyword/draft-2020-12/format", {});
defineKeyword("https://json-schema.org/keyword/draft-2020-12/format-assertion", {});
defineKeyword("https://json-schema.org/keyword/draft-2019-09/format", {});
defineKeyword("https://json-schema.org/keyword/draft-2019-09/format-assertion", {});
defineKeyword("https://json-schema.org/keyword/draft-07/format", {});
defineKeyword("https://json-schema.org/keyword/draft-06/format", {});
defineKeyword("https://json-schema.org/keyword/draft-04/format", {});
defineKeyword("https://json-schema.org/keyword/if", ifKeyword);
defineKeyword("https://json-schema.org/keyword/draft-04/items", itemsDraft04Keyword);
defineKeyword("https://json-schema.org/keyword/items", itemsKeyword);
defineKeyword("https://json-schema.org/keyword/draft-04/exclusiveMaximum", {});
defineKeyword("https://json-schema.org/keyword/exclusiveMaximum", {});
defineKeyword("https://json-schema.org/keyword/draft-04/exclusiveMinimum", {});
defineKeyword("https://json-schema.org/keyword/exclusiveMinimum", {});
defineKeyword("https://json-schema.org/keyword/draft-04/maximum", {});
defineKeyword("https://json-schema.org/keyword/maximum", {});
defineKeyword("https://json-schema.org/keyword/maxContains", {});
defineKeyword("https://json-schema.org/keyword/maxItems", {});
defineKeyword("https://json-schema.org/keyword/maxLength", {});
defineKeyword("https://json-schema.org/keyword/maxProperties", {});
defineKeyword("https://json-schema.org/keyword/draft-04/minimum", {});
defineKeyword("https://json-schema.org/keyword/minimum", {});
defineKeyword("https://json-schema.org/keyword/minContains", {});
defineKeyword("https://json-schema.org/keyword/minItems", {});
defineKeyword("https://json-schema.org/keyword/minLength", {});
defineKeyword("https://json-schema.org/keyword/minProperties", {});
defineKeyword("https://json-schema.org/keyword/multipleOf", {});
defineKeyword("https://json-schema.org/keyword/not", notKeyword);
defineKeyword("https://json-schema.org/keyword/oneOf", oneOfKeyword);
defineKeyword("https://json-schema.org/keyword/pattern", patternKeyword);
defineKeyword("https://json-schema.org/keyword/patternProperties", patternPropertiesKeyword);
defineKeyword("https://json-schema.org/keyword/prefixItems", prefixItemsKeyword);
defineKeyword("https://json-schema.org/keyword/properties", propertiesKeyword);
defineKeyword("https://json-schema.org/keyword/propertyNames", propertyNamesKeyword);
defineKeyword("https://json-schema.org/keyword/readOnly", { annotation: true });
defineKeyword("https://json-schema.org/keyword/ref", refKeyword);
defineKeyword("https://json-schema.org/keyword/required", {});
defineKeyword("https://json-schema.org/keyword/title", { annotation: true });
defineKeyword("https://json-schema.org/keyword/then", thenKeyword);
defineKeyword("https://json-schema.org/keyword/type", {});
defineKeyword("https://json-schema.org/keyword/unevaluatedItems", unevaluatedItemsKeyword);
defineKeyword("https://json-schema.org/keyword/unevaluatedProperties", unevaluatedPropertiesKeyword);
defineKeyword("https://json-schema.org/keyword/uniqueItems", {});
defineKeyword("https://json-schema.org/keyword/unknown", { annotation: true });
defineKeyword("https://json-schema.org/keyword/writeOnly", { annotation: true });

export {
  allTrue,
  countTrue,
  defineKeyword,
  describeConditional,
  describeScope,
  evaluateSchema,
  getErrors,
  getPlaceholder,
  getSuccesses,
  getValidity,
  isPlaceholder,
  jsonSchemaErrors,
  negate,
  removeErrorHandler,
  setErrorHandler,
  someTrue
} from "./json-schema-errors.js";
export { addTranslation } from "./localization.js";
export { JSE } from "./output-format.js";
