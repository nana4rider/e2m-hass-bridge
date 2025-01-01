import { Payload } from "@/payload/type";
import { assertBooleanType, getDeviceProperties } from "@/util/deviceUtil";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";

export function lightBuilder(apiDevice: ApiDevice): Payload {
  const statusProperty = getDeviceProperties(
    apiDevice,
    "operationStatus",
    true,
  );
  const { data } = statusProperty.schema;
  assertBooleanType(data);

  // TODO その他機能

  const [on, off] = data.enum;

  return {
    state_topic: statusProperty.mqttTopics,
    command_topic: `${statusProperty.mqttTopics}/set`,
    payload_on: on.name,
    payload_off: off.name,
  };
}
