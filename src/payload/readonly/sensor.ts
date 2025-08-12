import env from "@/env";
import type { Payload } from "@/payload/payloadType";
import {
  formattedPythonDict,
  getDecimalPlaces,
} from "@/util/dataTransformUtil";
import {
  getFirstElNumberType,
  getUnit,
  isElStateType,
} from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";

export default function buildSensor(
  apiDevice: ApiDevice,
  property: ApiDeviceProperty,
): Payload {
  const { data } = property.schema;

  const payload: Payload = {
    state_topic: property.mqttTopics,
  };

  const elNumberType = getFirstElNumberType(data);
  if (elNumberType) {
    let nativeValue: string;
    if (!elNumberType.multiple || Number.isInteger(elNumberType.multiple)) {
      nativeValue = "int";
    } else {
      nativeValue = "float";
      payload.suggested_display_precision = getDecimalPlaces(
        elNumberType.multiple,
      );
    }
    payload.native_value = nativeValue;
    payload.value_template = `
{% if value | ${nativeValue}(default=None) is not none %}
  {{ value | ${nativeValue} }}
{% else %}
  None
{% endif %}
`.trim();
  } else if (isElStateType(data)) {
    const valueMapping: Record<string, string> = {};
    data.enum.forEach(({ name, descriptions }) => {
      valueMapping[name] = descriptions[env.DESCRIPTION_LANGUAGE];
    });

    payload.value_template = `
{% set mapping = ${formattedPythonDict(valueMapping)} %}
{{ mapping.get(value) }}
    `.trim();
  }

  const unit = getUnit(data);
  if (unit !== undefined) {
    payload.unit_of_measurement = unit;

    const stateClass = getStateClass(unit);
    if (stateClass !== undefined) {
      payload.state_class = stateClass;
    }

    const deviceClassFromUnit = getDeviceClassFromUnit(unit);
    if (deviceClassFromUnit !== undefined) {
      payload.device_class = deviceClassFromUnit;
    }
  }

  // Fallback to property name-based detection for special cases
  const deviceClass = getDeviceClass(apiDevice, property);
  if (deviceClass !== undefined && !payload.device_class) {
    payload.device_class = deviceClass;
  }

  return payload;
}

function getDeviceClass(
  { deviceType }: ApiDevice,
  { name, schema }: ApiDeviceProperty,
): string | undefined {
  // Special cases where device type and property name matter
  // These override unit-based detection for specific sensor types
  if (deviceType === "temperatureSensor" && name === "value") {
    return "temperature";
  } else if (deviceType === "humiditySensor" && name === "value") {
    return "humidity";
  }

  // Get unit to help with classification
  const unit = getUnit(schema.data);

  // For % unit, determine device_class based on property name
  if (unit === "%") {
    if (name.match(/humidity/i)) {
      return "humidity";
    } else if (
      name.match(/battery/i) ||
      name.match(/remainingCapacity/i) ||
      name.match(/chargingRate/i) ||
      name.match(/stateOfCharge/i)
    ) {
      return "battery";
    }
    // Other percentages don't get a specific device_class
    return undefined;
  }

  // Fallback for properties without units but with clear naming patterns
  if (name.match(/temperature/i)) {
    return "temperature";
  } else if (name.match(/humidity/i)) {
    return "humidity";
  } else {
    return undefined;
  }
}

function getStateClass(unit: string): string | undefined {
  if (unit === "kWh" || unit === "Wh") {
    return "total_increasing";
  } else if (unit === "W" || unit === "kW") {
    return "measurement";
  }

  return undefined;
}

function getDeviceClassFromUnit(unit: string): string | undefined {
  // Energy units
  if (unit === "kWh" || unit === "Wh") {
    return "energy";
  }
  // Power units
  else if (unit === "W" || unit === "kW") {
    return "power";
  }
  // Temperature units (°C, °F, K)
  else if (unit === "°C" || unit === "°F" || unit === "K") {
    return "temperature";
  }
  // Volume units
  else if (unit === "L" || unit === "m³") {
    return "volume";
  }
  // Note: % is not mapped here as it can be battery, humidity, or other percentages
  // These should be determined by property name instead

  return undefined;
}
