import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";
import { assertElStateType } from "../../../util/deviceUtil";
import { Payload } from "../../type";

export function selectBuilder(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;
  assertElStateType(data);

  const options = data.enum.map((o) => o.name);

  return {
    state_topic: property.mqttTopics,
    command_topic: `${property.mqttTopics}/set`,
    options,
  };
}
