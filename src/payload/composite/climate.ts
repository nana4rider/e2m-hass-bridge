import env from "@/env";
import type { Payload } from "@/payload/payloadType";
import { formattedPythonDict, reverseKeyValue } from "@/util/dataTransformUtil";
import {
  getDeviceProperties,
  getDeviceValue,
  getManifactureConfig,
  isElStateType,
} from "@/util/deviceUtil";
import assert from "assert";
import type { ApiDevice } from "echonetlite2mqtt/server/ApiTypes";

const OperationModeMapping: Record<string, string> = {
  auto: "auto",
  cooling: "cool",
  heating: "heat",
  dehumidification: "dry",
  circulation: "fan_only",
};

const SwingAutoValue = {
  ja: "自動",
  en: "Automatic",
};

const SwingModeOrder = [
  "uppermost",
  "upperCenter",
  "central",
  "lowerCenter",
  "lowermost",
];

export default function buildClimate(apiDevice: ApiDevice): Payload {
  const operationMode = buildOperationMode(apiDevice);
  const fanMode = buildFanMode(apiDevice);
  const swingMode = buildSwingMode(apiDevice);

  return {
    ...operationMode,
    ...fanMode,
    ...swingMode,
    temperature_state_template: `
{% if value == 'undefined' %}
  None
{% else %}
  {{ value }}
{% endif %}
`.trim(),
    temperature_state_topic: `${apiDevice.mqttTopics}/properties/targetTemperature`,
    temperature_command_topic: `${apiDevice.mqttTopics}/properties/targetTemperature/set`,
    current_temperature_topic: `${apiDevice.mqttTopics}/properties/roomTemperature`,
    current_humidity_topic: `${apiDevice.mqttTopics}/properties/humidity`,
  };
}

function buildOperationMode(apiDevice: ApiDevice): Payload {
  const operationMode = getDeviceProperties(apiDevice, "operationMode");
  if (!operationMode) return {};

  const { data } = operationMode.schema;
  assert(isElStateType(data));
  const modes = data.enum
    .map(({ name }) => OperationModeMapping[name])
    .filter(Boolean);
  modes.push("off");

  return {
    modes,
    mode_state_topic: `${apiDevice.mqttTopics}/properties`,
    mode_state_template: `
{% if value_json.operationStatus == 'false' %}
  off
{% else %}
  {% set mapping = ${formattedPythonDict(OperationModeMapping)} %}
  {{ mapping.get(value_json.operationMode) }}
{% endif %}
`.trim(),
    mode_command_topic: `${apiDevice.mqttTopics}/properties/set`,
    mode_command_template: `
{% if value == 'off' %}
  {"operationStatus": "false"}
{% else %}
  {% set mapping = ${formattedPythonDict(reverseKeyValue(OperationModeMapping))} %}
  {"operationStatus": "true", "operationMode": "{{ mapping[value] }}"}
{% endif %}
`.trim(),
  };
}

function buildFanMode(apiDevice: ApiDevice): Payload {
  const airFlowLevel = getDeviceProperties(apiDevice, "airFlowLevel");
  if (!airFlowLevel?.writable) return {};

  const manufacturer = getDeviceValue(apiDevice, "manufacturer", true);
  const climateConfig = getManifactureConfig(manufacturer, "climate");
  const fanmodeMapping = climateConfig?.fanmodeMapping;
  if (!fanmodeMapping) return {};

  return {
    fan_modes: Object.keys(fanmodeMapping.command),
    fan_mode_state_topic: `${apiDevice.mqttTopics}/properties/airFlowLevel`,
    fan_mode_state_template: `
{% set mapping = ${formattedPythonDict(fanmodeMapping.state)} %}
{{ mapping.get(value) }}
`.trim(),
    fan_mode_command_topic: `${apiDevice.mqttTopics}/properties/airFlowLevel/set`,
    fan_mode_command_template: `
{% set mapping = ${formattedPythonDict(fanmodeMapping.command)} %}
{{ mapping[value] }}
`.trim(),
  };
}

function buildSwingMode(apiDevice: ApiDevice): Payload {
  const airFlowDirectionVertical = getDeviceProperties(
    apiDevice,
    "airFlowDirectionVertical",
  );
  const automaticControlAirFlowDirection = getDeviceProperties(
    apiDevice,
    "automaticControlAirFlowDirection",
  );
  if (
    !airFlowDirectionVertical?.writable ||
    !automaticControlAirFlowDirection?.writable
  ) {
    return {};
  }

  // 風向自動設定の上下AUTOと、風向上下設定が使える場合のみ利用可能
  const { data: verticalData } = airFlowDirectionVertical.schema;
  const { data: autoData } = automaticControlAirFlowDirection.schema;
  if (
    !isElStateType(verticalData) ||
    verticalData.enum.length === 0 ||
    !isElStateType(autoData) ||
    !autoData.enum.some(({ name }) => name === "autoVertical")
  ) {
    return {};
  }

  const stateMapping: Record<string, string> = {};
  const commandMapping: Record<string, string> = {};
  verticalData.enum.forEach(({ name, descriptions }) => {
    stateMapping[name] = descriptions[env.DESCRIPTION_LANGUAGE];
    commandMapping[descriptions[env.DESCRIPTION_LANGUAGE]] = name;
  });

  // enum
  const orderedSwingModes = SwingModeOrder.filter(
    (mode) => stateMapping[mode],
  ).map((mode) => stateMapping[mode]);
  const unorderedSwingModes = Object.values(stateMapping).filter(
    (mode) => !orderedSwingModes.includes(mode),
  );

  return {
    swing_modes: [
      SwingAutoValue[env.DESCRIPTION_LANGUAGE],
      ...orderedSwingModes,
      ...unorderedSwingModes,
    ],
    swing_mode_state_topic: `${apiDevice.mqttTopics}/properties`,
    swing_mode_state_template: `
{% if value_json.automaticControlAirFlowDirection == 'autoVertical' %}
  ${SwingAutoValue[env.DESCRIPTION_LANGUAGE]}
{% else %}
  {% set mapping = ${formattedPythonDict(stateMapping)} %}
  {{ mapping.get(value_json.airFlowDirectionVertical) }}
{% endif %}
`.trim(),
    swing_mode_command_topic: `${apiDevice.mqttTopics}/properties/set`,
    swing_mode_command_template: `
{% if value == '${SwingAutoValue[env.DESCRIPTION_LANGUAGE]}' %}
    {"automaticControlAirFlowDirection": "autoVertical"}
{% else %}
  {% set mapping = ${formattedPythonDict(commandMapping)} %}
    {"airFlowDirectionVertical": "{{ mapping[value] }}"}
{% endif %}
`.trim(),
  };
}
