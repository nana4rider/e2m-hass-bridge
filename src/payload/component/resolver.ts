import { SimpleComponent } from "@/payload/type";
import {
  isBooleanType,
  isElNumberType,
  isElStateType,
} from "@/util/deviceUtil";
import type { ApiDeviceProperty } from "echonetlite2mqtt/server/ApiTypes";

export function getSimpleComponent(
  property: ApiDeviceProperty,
): SimpleComponent | undefined {
  const { data, accessRule } = property.schema;
  // 値を読み取れないプロパティはサポートしない
  if (accessRule.get === "notApplicable") {
    return undefined;
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
      (isElStateType(data) && data.enum[0].name === "open")
    ) {
      return "binary_sensor";
    } else {
      return "sensor";
    }
  }
}
