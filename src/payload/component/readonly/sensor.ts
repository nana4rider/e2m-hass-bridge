import { Payload } from "@/payload/type";
import { getUnit, isElNumberType } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export function sensorBuilder(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;

  const payload: Payload = {
    state_topic: property.mqttTopics,
  };

  if (isElNumberType(data)) {
    payload.value_template = `
{% if value | float(default=None) is not none %}
  {{ value | float }}
{% else %}
  unknown
{% endif %}
`.trim();
  }

  const deviceClass = getDeviceClass(property);
  if (deviceClass) {
    payload.device_class = deviceClass;
  }

  const unit = getUnit(data);
  if (unit) {
    payload.unit_of_measurement = unit;
  }

  return payload;
}

function getDeviceClass(property: ApiDeviceProperty): string | undefined {
  const { name } = property;

  if (name === "consumedCumulativeElectricEnergy") {
    return "energy";
  } else if (
    name === "remainingWater" ||
    name === "tankCapacity" ||
    name.match(/^bathWaterVolume/)
  ) {
    return "volume";
  } else if (name.match(/ElectricPowerFor/)) {
    return "power";
  } else if (name.match(/temperature/i)) {
    return "temperature";
  } else if (name.match(/humidity/i)) {
    return "humidity";
  } else {
    return undefined;
  }
}
