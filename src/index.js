import * as Instance from "@hyperjump/json-schema/instance/experimental";
import { normalizedErrorOuput, setNormalizationHandler } from "./normalized-output.js";
import { getErrors, addErrorHandler } from "./error-handling.js";
import { Localization } from "./localization.js";

// Normalization Handlers
import additionalProperties from "./normalization-handlers/additionalProperties.js";
import allOf from "./normalization-handlers/allOf.js";
import anyOf from "./normalization-handlers/anyOf.js";
import constKeyword from "./normalization-handlers/const.js";
import contains from "./normalization-handlers/contains.js";
import dependentRequired from "./normalization-handlers/dependentRequired.js";
import dependentSchema from "./normalization-handlers/dependentSchema.js";
import definitions from "./normalization-handlers/definitions.js";
import elseKeyword from "./normalization-handlers/else.js";
import enumKeyword from "./normalization-handlers/enum.js";
import exclusiveMaximum from "./normalization-handlers/exclusiveMaximum.js";
import exclusiveMinimum from "./normalization-handlers/exclusiveMinimum.js";
import items from "./normalization-handlers/items.js";
import maxContains from "./normalization-handlers/maxContains.js";
import maxItems from "./normalization-handlers/maxItems.js";
import maxLength from "./normalization-handlers/maxLength.js";
import maxProperties from "./normalization-handlers/maxProperties.js";
import maximum from "./normalization-handlers/maximum.js";
import minContains from "./normalization-handlers/minContains.js";
import minItems from "./normalization-handlers/minItems.js";
import minLength from "./normalization-handlers/minLength.js";
import minProperties from "./normalization-handlers/minProperties.js";
import minimum from "./normalization-handlers/minimum.js";
import multipleOf from "./normalization-handlers/multipleOf.js";
import not from "./normalization-handlers/not.js";
import oneOf from "./normalization-handlers/oneOf.js";
import pattern from "./normalization-handlers/pattern.js";
import patternProperties from "./normalization-handlers/patternProperties.js";
import prefixItems from "./normalization-handlers/prefixItems.js";
import properties from "./normalization-handlers/properties.js";
import propertyNames from "./normalization-handlers/propertyNames.js";
import ref from "./normalization-handlers/ref.js";
import required from "./normalization-handlers/required.js";
import then from "./normalization-handlers/then.js";
import type from "./normalization-handlers/type.js";
import unevaluatedItems from "./normalization-handlers/unevaluatedItems.js";
import unevaluatedProperties from "./normalization-handlers/unevaluatedProperties.js";
import uniqueItems from "./normalization-handlers/uniqueItems.js";

// Error Handlers
import anyOfErrorHandler from "./error-handlers/anyOf.js";
import additionalPropertiesErrorHandler from "./error-handlers/additionalProperties.js";
import arrayRangeErrorHandler from "./error-handlers/array-range-handler.js";
import constErrorHandler from "./error-handlers/const.js";
import containsErrorHandler from "./error-handlers/contains.js";
import enumErrorHandler from "./error-handlers/enum.js";
import format from "./normalization-handlers/format.js";
import formatErrorHandler from "./error-handlers/format.js";
import multipleOfErrorHandler from "./error-handlers/multipleOf.js";
import notErrorHandler from "./error-handlers/not.js";
import numberRangeHandler from "./error-handlers/number-range-handler.js";
import requiredErrorHandler from "./error-handlers/required.js";
import typeErrorHandler from "./error-handlers/type.js";
import uniqueItemsErrorHandler from "./error-handlers/uniqueItems.js";
import stringErrorHandler from "./error-handlers/string-handler.js";
import patternErrorHandler from "./error-handlers/pattern.js";
import propertiesRangeHandler from "./error-handlers/properties-range-handler.js";
import validationErrorHandler from "./error-handlers/validation.js";

/**
 * @import { betterJsonSchemaErrors } from "./index.d.ts"
 */

/** @type betterJsonSchemaErrors */
export async function betterJsonSchemaErrors(errorOutput, schemaUri, instance, options = {}) {
  const normalizedErrors = await normalizedErrorOuput(instance, errorOutput, schemaUri);
  const rootInstance = Instance.fromJs(instance);
  const localization = await Localization.forLocale(options.language ?? "en-US");
  return { errors: await getErrors(normalizedErrors, rootInstance, localization) };
};

setNormalizationHandler("https://json-schema.org/keyword/additionalProperties", additionalProperties);
setNormalizationHandler("https://json-schema.org/keyword/allOf", allOf);
setNormalizationHandler("https://json-schema.org/keyword/anyOf", anyOf);
setNormalizationHandler("https://json-schema.org/keyword/const", constKeyword);
setNormalizationHandler("https://json-schema.org/keyword/contains", contains);
setNormalizationHandler("https://json-schema.org/keyword/dependentRequired", dependentRequired);
setNormalizationHandler("https://json-schema.org/keyword/dependentSchema", dependentSchema);
setNormalizationHandler("https://json-schema.org/keyword/definitions", definitions);
setNormalizationHandler("https://json-schema.org/keyword/else", elseKeyword);
setNormalizationHandler("https://json-schema.org/keyword/enum", enumKeyword);
setNormalizationHandler("https://json-schema.org/keyword/draft-2020-12/format", format);
setNormalizationHandler("https://json-schema.org/keyword/draft-2019-09/format", format);
setNormalizationHandler("https://json-schema.org/keyword/draft-07/format", format);
setNormalizationHandler("https://json-schema.org/keyword/draft-06/format", format);
setNormalizationHandler("https://json-schema.org/keyword/draft-04/format", format);
setNormalizationHandler("https://json-schema/keyword/exclusiveMaximum", exclusiveMaximum);
setNormalizationHandler("https://json-schema/keyword/exclusiveMinimum", exclusiveMinimum);
setNormalizationHandler("https://json-schema.org/keyword/items", items);
setNormalizationHandler("https://json-schema.org/keyword/maxContains", maxContains);
setNormalizationHandler("https://json-schema.org/keyword/maxItems", maxItems);
setNormalizationHandler("https://json-schema.org/keyword/maxLength", maxLength);
setNormalizationHandler("https://json-schema.org/keyword/maxProperties", maxProperties);
setNormalizationHandler("https://json-schema.org/keyword/maximum", maximum);
setNormalizationHandler("https://json-schema.org/keyword/minContains", minContains);
setNormalizationHandler("https://json-schema.org/keyword/minItems", minItems);
setNormalizationHandler("https://json-schema.org/keyword/minLength", minLength);
setNormalizationHandler("https://json-schema.org/keyword/minProperties", minProperties);
setNormalizationHandler("https://json-schema.org/keyword/minimum", minimum);
setNormalizationHandler("https://json-schema/keyword/multipleOf", multipleOf);
setNormalizationHandler("https://json-schema.org/keyword/not", not);
setNormalizationHandler("https://json-schema.org/keyword/oneOf", oneOf);
setNormalizationHandler("https://json-schema.org/keyword/pattern", pattern);
setNormalizationHandler("https://json-schema.org/keyword/patternProperties", patternProperties);
setNormalizationHandler("https://json-schema.org/keyword/prefixItems", prefixItems);
setNormalizationHandler("https://json-schema.org/keyword/properties", properties);
setNormalizationHandler("https://json-schema.org/keyword/propertyNames", propertyNames);
setNormalizationHandler("https://json-schema.org/keyword/ref", ref);
setNormalizationHandler("https://json-schema.org/keyword/required", required);
setNormalizationHandler("https://json-schema.org/keyword/then", then);
setNormalizationHandler("https://json-schema.org/keyword/type", type);
setNormalizationHandler("https://json-schema.org/keyword/unevaluatedItems", unevaluatedItems);
setNormalizationHandler("https://json-schema.org/keyword/unevaluatedProperties", unevaluatedProperties);
setNormalizationHandler("https://json-schema.org/keyword/uniqueItems", uniqueItems);

addErrorHandler(anyOfErrorHandler);
addErrorHandler(additionalPropertiesErrorHandler);
addErrorHandler(constErrorHandler);
addErrorHandler(containsErrorHandler);
addErrorHandler(enumErrorHandler);
addErrorHandler(formatErrorHandler);
addErrorHandler(arrayRangeErrorHandler);
addErrorHandler(multipleOfErrorHandler);
addErrorHandler(notErrorHandler);
addErrorHandler(numberRangeHandler);
addErrorHandler(requiredErrorHandler);
addErrorHandler(typeErrorHandler);
addErrorHandler(uniqueItemsErrorHandler);
addErrorHandler(stringErrorHandler);
addErrorHandler(patternErrorHandler);
addErrorHandler(propertiesRangeHandler);
addErrorHandler(validationErrorHandler);

export { setNormalizationHandler } from "./normalized-output.js";
export { addErrorHandler } from "./error-handling.js";
