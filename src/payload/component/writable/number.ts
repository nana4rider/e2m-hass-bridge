import { Payload } from "@/payload/type";
import {
  assertElNumberType,
  getManifactureConfig,
  getUnit,
} from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function numberBuilder(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assertElNumberType(data);

  const payload: Payload = {
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
  };

  const unit = getUnit(data);
  if (unit) {
    payload.unit_of_measurement = unit;
  }

  const numberRangeConfig = getManifactureConfig(apiDevice, "numberRange");
  const numberRangePropertyConfig =
    numberRangeConfig?.[apiDevice.deviceType]?.[property.name];
  const configMax = numberRangePropertyConfig?.max;
  const configMin = numberRangePropertyConfig?.min;
  const min = configMin ?? data.minimum;
  const max = configMax ?? data.maximum;

  if (min) {
    payload.min = min;
  }
  if (max) {
    payload.max = max;
  }

  return payload;
}
