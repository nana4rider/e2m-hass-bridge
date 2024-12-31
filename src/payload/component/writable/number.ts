import { Payload } from "@/payload/type";
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

  const { maximum, minimum } = data;
  if (maximum) {
    payload.max = maximum;
  }
  if (minimum) {
    payload.min = minimum;
  }

  return payload;
}
