import {
  Manufacturer,
  ManufacturerConfig,
  ManufacturerConfigMap,
  UnitMapping,
} from "@/deviceConfig";
import { CompositeComponentId, Payload } from "@/payload/type";
import { hex2ascii } from "@/util/dataTransformUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";
import {
  ElDataType,
  ElNumberType,
  ElStateType,
} from "echonetlite2mqtt/server/MraTypes";

export function getDeviceValue<T = string, R extends boolean = false>(
  apiDevice: ApiDevice,
  propertyName: string,
  strict?: R,
): R extends true ? T : T | undefined {
  const value = apiDevice.values[propertyName]?.value as T | undefined;
  if (strict) {
    if (value === undefined) {
      throw new Error(`Property "${propertyName}" is not defined.`);
    }
    return value as R extends true ? T : never;
  }
  return value as R extends true ? never : T | undefined;
}

export function getDeviceProperties<R extends boolean = false>(
  apiDevice: ApiDevice,
  propertyName: string,
  strict?: R,
): R extends true ? ApiDeviceProperty : ApiDeviceProperty | undefined {
  const property = apiDevice.properties.find(
    (prop) => prop.name === propertyName,
  );
  if (strict) {
    if (property === undefined) {
      throw new Error(`Property "${propertyName}" is not defined.`);
    }
    return property as R extends true ? ApiDeviceProperty : never;
  }
  return property as R extends true ? never : ApiDeviceProperty | undefined;
}

export function getManufacturerName(apiDevice: ApiDevice) {
  const manufacturer = getDeviceValue(apiDevice, "manufacturer", true);
  const entry = Object.entries(Manufacturer).find(
    ([, value]) => value === manufacturer,
  );
  return entry ? entry[0] : manufacturer;
}

export function getAsciiProductCode(apiDevice: ApiDevice): string | undefined {
  const productCode = getDeviceValue(apiDevice, "productCode");
  return productCode ? hex2ascii(productCode) : undefined;
}

export function getFirstElNumberType(
  data: ElDataType,
): ElNumberType | undefined {
  if ("oneOf" in data) {
    return getFirstElNumberType(data.oneOf[0]);
  } else if (isElNumberType(data)) {
    return data;
  } else {
    return undefined;
  }
}

export function getUnit(data: ElDataType): string | undefined {
  const elNumberType = getFirstElNumberType(data);
  if (!elNumberType?.unit) {
    return undefined;
  } else {
    return UnitMapping[elNumberType.unit] ?? elNumberType.unit;
  }
}

export function isElNumberType(data: ElDataType): data is ElNumberType {
  return "type" in data && data.type === "number";
}

export function assertElNumberType(
  data: ElDataType,
): asserts data is ElNumberType {
  if (!isElNumberType(data)) {
    throw new Error(`data is not ElNumberType.`);
  }
}

export function isElStateType(data: ElDataType): data is ElStateType {
  return "type" in data && data.type === "state";
}

export function assertElStateType(
  data: ElDataType,
): asserts data is ElStateType {
  if (!isElStateType(data)) {
    throw new Error(`data is not ElStateType.`);
  }
}

export function isBooleanType(data: ElDataType): data is ElStateType {
  return (
    isElStateType(data) &&
    data.enum.length === 2 &&
    data.enum[0].name === "true"
  );
}

export function assertBooleanType(
  data: ElDataType,
): asserts data is ElStateType {
  if (!isBooleanType(data)) {
    throw new Error(`data is not boolean.`);
  }
}

export function getManifactureConfig<T extends keyof ManufacturerConfig>(
  apiDevice: ApiDevice,
  key: T,
): ManufacturerConfig[T] | undefined {
  const manufacturer = getDeviceValue(apiDevice, "manufacturer", true);

  if (!(manufacturer in ManufacturerConfigMap)) return undefined;

  const configMap =
    ManufacturerConfigMap[manufacturer as keyof typeof ManufacturerConfigMap];
  if (!configMap) return undefined;

  return configMap[key];
}

export function getSimpleOverridePayload(
  apiDevice: ApiDevice,
  propertyName: string,
): Payload {
  const manufacturer = getDeviceValue(apiDevice, "manufacturer", true);

  if (!(manufacturer in ManufacturerConfigMap)) return {};

  const configMap =
    ManufacturerConfigMap[manufacturer as keyof typeof ManufacturerConfigMap];

  return (
    configMap?.override?.simple?.[apiDevice.deviceType]?.[propertyName] ?? {}
  );
}

export function getCompositeOverridePayload(
  apiDevice: ApiDevice,
  compositeComponentId: CompositeComponentId,
): Payload {
  const manufacturer = getDeviceValue(apiDevice, "manufacturer", true);

  if (!(manufacturer in ManufacturerConfigMap)) return {};

  const configMap =
    ManufacturerConfigMap[manufacturer as keyof typeof ManufacturerConfigMap];

  return configMap?.override?.composite?.[compositeComponentId] ?? {};
}
