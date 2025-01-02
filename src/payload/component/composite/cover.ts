import { Payload } from "@/payload/type";
import { getDeviceProperties } from "@/util/deviceUtil";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";

export function coverBuilder(apiDevice: ApiDevice): Payload {
  const openCloseStatusProperty = getDeviceProperties(
    apiDevice,
    "openCloseStatus",
    true,
  );
  const openCloseOperationProperty = getDeviceProperties(
    apiDevice,
    "openCloseOperation",
    true,
  );

  return {
    state_topic: openCloseStatusProperty.mqttTopics,
    state_closed: "fullyClosed",
    state_closing: "closing",
    state_open: "fullyOpen",
    state_opening: "opening",
    state_stopped: "stoppedHalfway",
    command_topic: `${openCloseOperationProperty.mqttTopics}/set`,
    payload_close: "close",
    payload_open: "open",
    payload_stop: "stop",
    device_class: "shutter",
  };
}
