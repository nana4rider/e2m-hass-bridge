import type { Payload } from "@/payload/payloadType";
import { getUnit, isElNumberType } from "@/util/deviceUtil";
import assert from "assert";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export default function buildNumber(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assert(isElNumberType(data));

  const payload: Payload = {
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
  };

  const unit = getUnit(data);
  if (unit !== undefined) {
    payload.unit_of_measurement = unit;
  }

  if (data.minimum !== undefined) {
    payload.min = data.minimum;
  }
  if (data.maximum !== undefined) {
    payload.max = data.maximum;
  }

  return payload;
}
