import { Payload } from "@/payload/type";
import { formattedPythonDict, reverseKeyValue } from "@/util/dataTransformUtil";
import {
  assertElStateType,
  getDeviceProperties,
  getManifactureConfig,
} from "@/util/deviceUtil";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";

const OperationModeMapping = {
  auto: "auto",
  cooling: "cool",
  heating: "heat",
  dehumidification: "dry",
  circulation: "fan_only",
  other: "unknown",
};

export function climateBuilder(apiDevice: ApiDevice): Payload {
  const operationMode = operationModeBuilder(apiDevice);
  const tempRange = tempRangeBuilder(apiDevice);
  const fanMode = fanModeBuilder(apiDevice);

  return {
    ...operationMode,
    ...tempRange,
    ...fanMode,
    temperature_state_topic: `${apiDevice.mqttTopics}/properties/targetTemperature`,
    temperature_command_topic: `${apiDevice.mqttTopics}/properties/targetTemperature/set`,
    current_temperature_topic: `${apiDevice.mqttTopics}/properties/roomTemperature`,
    current_humidity_topic: `${apiDevice.mqttTopics}/properties/humidity`,
  };
}

function getModes(apiDevice: ApiDevice): string[] {
  const operationMode = getDeviceProperties(apiDevice, "operationMode", true);
  const { data } = operationMode.schema;
  assertElStateType(data);
  const modes: string[] = data.enum
    .map(({ name }) =>
      name in OperationModeMapping
        ? OperationModeMapping[name as keyof typeof OperationModeMapping]
        : undefined,
    )
    .filter((name): name is string => Boolean(name));
  modes.push("off");

  return modes;
}

function operationModeBuilder(apiDevice: ApiDevice): Payload {
  return {
    modes: getModes(apiDevice),
    mode_command_template: `
{% if value == 'off' %}
  {"operationStatus": "false"}
{% else %}
  {% set mapping = ${formattedPythonDict(reverseKeyValue(OperationModeMapping))} %}
  {{ {"operationStatus": "true", "operationMode": mapping[value]} | tojson }}
{% endif %}`.trim(),
    mode_command_topic: `${apiDevice.mqttTopics}/properties/set`,
    mode_state_topic: `${apiDevice.mqttTopics}/properties`,
    mode_state_template: `
{% if value_json.operationStatus == 'false' %}
  off
{% else %}
  {% set mapping = ${formattedPythonDict(OperationModeMapping)} %}
  {{ mapping.get(value_json.operationMode, 'unknown') }}
{% endif %}`.trim(),
  };
}

function tempRangeBuilder(apiDevice: ApiDevice): Payload {
  const payload: Payload = {};

  const manufacturerConfig = getManifactureConfig(apiDevice);
  const climateConfig = manufacturerConfig?.climate;
  if (climateConfig?.minTemperature) {
    payload.min_temp = climateConfig.minTemperature;
  }
  if (climateConfig?.maxTemperature) {
    payload.max_temp = climateConfig.maxTemperature;
  }

  return payload;
}

function fanModeBuilder(apiDevice: ApiDevice): Payload {
  const airFlowLevel = getDeviceProperties(apiDevice, "airFlowLevel", true);
  if (!airFlowLevel.writable) return {};

  const manufacturerConfig = getManifactureConfig(apiDevice);
  const fanmodeMapping = manufacturerConfig?.climate?.fanmodeMapping;
  if (!fanmodeMapping) return {};

  return {
    fan_modes: Object.keys(fanmodeMapping.command),
    fan_mode_command_topic: `${apiDevice.mqttTopics}/properties/airFlowLevel/set`,
    fan_mode_command_template: `
{% set mapping = ${formattedPythonDict(fanmodeMapping.command)} %}
{{ mapping[value] }}`.trim(),
    fan_mode_state_topic: `${apiDevice.mqttTopics}/properties/airFlowLevel`,
    fan_mode_state_template: `
{% set mapping = ${formattedPythonDict(fanmodeMapping.state)} %}
{{ mapping.get(value, 'unknown') }}
`.trim(),
  };
}
