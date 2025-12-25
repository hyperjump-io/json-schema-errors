import { addErrorHandler, setNormalizationHandler } from "./json-schema-errors.js";

// Normalization Handlers
import constNormalizationHandler from "./normalization-handlers/const.js";
import dependentRequiredNormalizationHandler from "./normalization-handlers/dependentRequired.js";
import definitionsNormalizationHandler from "./normalization-handlers/definitions.js";
import enumNormalizationHandler from "./normalization-handlers/enum.js";
import exclusiveMaximumNormalizationHandler from "./normalization-handlers/exclusiveMaximum.js";
import exclusiveMinimumNormalizationHandler from "./normalization-handlers/exclusiveMinimum.js";
import formatNormalizationHandler from "./normalization-handlers/format.js";
import maximumNormalizationHandler from "./normalization-handlers/maximum.js";
import minimumNormalizationHandler from "./normalization-handlers/minimum.js";
import propertiesNormalizationHandler from "./normalization-handlers/properties.js";
import refNormalizationHandler from "./normalization-handlers/ref.js";
import requiredNormalizationHandler from "./normalization-handlers/required.js";
import typeNormalizationHandler from "./normalization-handlers/type.js";

// Error Handlers
import constErrorHandler from "./error-handlers/const.js";
import enumErrorHandler from "./error-handlers/enum.js";
import booleanSchemaErrorHandler from "./error-handlers/boolean-schema.js";
import typeErrorHandler from "./error-handlers/type.js";
import dependentRequiredErrorHandler from "./error-handlers/dependentRequired.js";
import exclusiveMaximumErrorHandler from "./error-handlers/exclusiveMaximum.js";
import exclusiveMinimumErrorHandler from "./error-handlers/exclusiveMinimum.js";
import maximumErrorHandler from "./error-handlers/maximum.js";
import minimumErrorHandler from "./error-handlers/minimum.js";
import formatErrorHandler from "./error-handlers/format.js";
import requiredErrorHandler from "./error-handlers/required.js";

setNormalizationHandler("https://json-schema.org/keyword/const", constNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/dependentRequired", dependentRequiredNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/definitions", definitionsNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/enum", enumNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/draft-2020-12/format", formatNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/draft-2020-12/format-assertion", formatNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/draft-2019-09/format", formatNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/draft-2019-09/format-assertion", formatNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/draft-07/format", formatNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/draft-06/format", formatNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/draft-04/format", formatNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/exclusiveMaximum", exclusiveMaximumNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/exclusiveMinimum", exclusiveMinimumNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/maximum", maximumNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/minimum", minimumNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/properties", propertiesNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/ref", refNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/required", requiredNormalizationHandler);
setNormalizationHandler("https://json-schema.org/keyword/type", typeNormalizationHandler);

addErrorHandler(constErrorHandler);
addErrorHandler(enumErrorHandler);
addErrorHandler(booleanSchemaErrorHandler);
addErrorHandler(typeErrorHandler);
addErrorHandler(dependentRequiredErrorHandler);
addErrorHandler(exclusiveMaximumErrorHandler);
addErrorHandler(exclusiveMinimumErrorHandler);
addErrorHandler(minimumErrorHandler);
addErrorHandler(maximumErrorHandler);
addErrorHandler(formatErrorHandler);
addErrorHandler(requiredErrorHandler);

export { addErrorHandler, jsonSchemaErrors, setNormalizationHandler } from "./json-schema-errors.js";
