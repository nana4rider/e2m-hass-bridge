import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";
import env from "env-var";
import { getAsciiProductCode, getManufacturerName } from "../util/deviceUtil";

export const language =
  env.get("DISCOVERY_LANGUAGE").asString() === "en" ? "en" : "ja";

export function createDevice(apiDevice: ApiDevice) {
  const manufacturer = getManufacturerName(apiDevice);
  const model = getAsciiProductCode(apiDevice);
  return {
    identifiers: [`echonetlite_${apiDevice.id}`],
    name: `${apiDevice.descriptions[language]}(${apiDevice.ip})`,
    manufacturer,
    model,
  };
}

export const origin = {
  name: "e2m-hass-bridge",
  sw_version: "1.0.0",
  support_url: "https://github.com/nana4rider/e2m-hass-bridge",
};
