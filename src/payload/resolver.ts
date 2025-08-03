import type {
  CompositeComponentConfig,
  SimpleComponent,
  SimpleComponentConfig,
} from "@/payload/payloadType";
import {
  isBooleanType,
  isElNumberType,
  isElStateType,
} from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function getSimpleComponent(
  { deviceType }: ApiDevice,
  property: ApiDeviceProperty,
): SimpleComponent | undefined {
  const { data, accessRule } = property.schema;
  const { name } = property;
  // 値を読み取れないプロパティはサポートしない
  if (accessRule.get === "notApplicable") return undefined;

  // デバイス固有の設定
  if (
    deviceType === "monoFunctionalLighting" ||
    deviceType === "generalLighting"
  ) {
    if (name === "operationStatus") {
      return "light";
    }
  } else if (deviceType === "electricLock") {
    if (name === "mainElectricLock" || name === "subElectricLock") {
      return "lock";
    }
  }

  if (property.writable) {
    // 更新可
    if (isBooleanType(data)) {
      return "switch";
    } else if (isElStateType(data)) {
      return "select";
    } else if (isElNumberType(data)) {
      return "number";
    } else {
      return "text";
    }
  } else {
    // 更新不可
    if (
      isBooleanType(data) ||
      (isElStateType(data) &&
        data.enum.length === 2 &&
        data.enum[0].name === "open")
    ) {
      return "binary_sensor";
    } else {
      return "sensor";
    }
  }
}

export function createUniqueId(
  apiDevice: ApiDevice,
  componentConfig: SimpleComponentConfig | CompositeComponentConfig,
): string {
  if ("compositeComponentId" in componentConfig) {
    return `echonetlite_${apiDevice.id}_composite_${componentConfig.compositeComponentId}`;
  } else {
    return `echonetlite_${apiDevice.id}_simple_${componentConfig.property.name}`;
  }
}
