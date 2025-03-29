import type { DeviceConfig } from "@/deviceConfig";
import {
  GlobalDeviceConfig,
  Manufacturer,
  ManufacturerDeviceConfig,
  UnitMapping,
} from "@/deviceConfig";
import type { CompositeComponentId, Payload } from "@/payload/payloadType";
import { hex2ascii } from "@/util/dataTransformUtil";
import assert from "assert";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";
import type {
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
    assert(value !== undefined, `Property "${propertyName}" is not defined.`);
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
    assert(
      property !== undefined,
      `Property "${propertyName}" is not defined.`,
    );
    return property as R extends true ? ApiDeviceProperty : never;
  }
  return property as R extends true ? never : ApiDeviceProperty | undefined;
}

export function getManufacturerName(apiDevice: ApiDevice): string {
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

export function isElStateType(data: ElDataType): data is ElStateType {
  return "type" in data && data.type === "state";
}

export function isBooleanType(data: ElDataType): data is ElStateType {
  return (
    isElStateType(data) &&
    data.enum.length === 2 &&
    data.enum[0].name === "true"
  );
}

export function getManifactureConfig<T extends keyof DeviceConfig>(
  manufacturer: string,
  key: T,
): DeviceConfig[T] | undefined {
  if (!(manufacturer in ManufacturerDeviceConfig)) return undefined;

  const configMap = ManufacturerDeviceConfig[manufacturer];
  if (!configMap) return undefined;

  return configMap[key];
}

export function getSimpleOverridePayload(
  apiDevice: ApiDevice,
  propertyName: string,
): Payload {
  const payload = {
    ...GlobalDeviceConfig?.override?.simple?.[apiDevice.deviceType]?.[
      propertyName
    ],
  };
  const manufacturer = getDeviceValue(apiDevice, "manufacturer", true);
  if (!(manufacturer in ManufacturerDeviceConfig)) return payload;
  const overrideConfig = getManifactureConfig(manufacturer, "override");

  return {
    ...payload,
    ...overrideConfig?.simple?.[apiDevice.deviceType]?.[propertyName],
  };
}

export function getCompositeOverridePayload(
  apiDevice: ApiDevice,
  compositeComponentId: CompositeComponentId,
): Payload {
  const payload = {
    ...GlobalDeviceConfig?.override?.composite?.[compositeComponentId],
  };
  const manufacturer = getDeviceValue(apiDevice, "manufacturer", true);
  if (!(manufacturer in ManufacturerDeviceConfig)) return payload;
  const overrideConfig = getManifactureConfig(manufacturer, "override");

  return {
    ...payload,
    ...overrideConfig?.composite?.[compositeComponentId],
  };
}

export function getAutoRequestProperties(apiDevice: ApiDevice): string[] {
  let propertyNames = [
    ...(GlobalDeviceConfig?.autoRequestProperties?.["*"] ?? []),
    ...(GlobalDeviceConfig?.autoRequestProperties?.[apiDevice.deviceType] ??
      []),
  ];
  const manufacturer = getDeviceValue(apiDevice, "manufacturer", true);
  if (manufacturer in ManufacturerDeviceConfig) {
    const autoRequestProperties = getManifactureConfig(
      manufacturer,
      "autoRequestProperties",
    );

    propertyNames = [
      ...propertyNames,
      ...(autoRequestProperties?.["*"] ?? []),
      ...(autoRequestProperties?.[apiDevice.deviceType] ?? []),
    ];
  }

  return propertyNames.filter(
    (propertyName) =>
      getDeviceProperties(apiDevice, propertyName) !== undefined,
  );
}
