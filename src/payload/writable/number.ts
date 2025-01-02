import { Payload } from "@/payload/payloadType";
import { assertElNumberType, getUnit } from "@/util/deviceUtil";
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

  if (data.minimum) {
    payload.min = data.minimum;
  }
  if (data.maximum) {
    payload.max = data.maximum;
  }

  return payload;
}
