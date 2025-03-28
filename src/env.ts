import { cleanEnv, num, port, str, testOnly } from "envalid";

const env = cleanEnv(process.env, {
  MQTT_BROKER: str({
    desc: "MQTTブローカー",
    example: "mqtt://localhost",
    devDefault: testOnly("mqtt://mqtt-broker"),
  }),
  MQTT_USERNAME: str({
    desc: "MQTTユーザ名",
    default: undefined,
    devDefault: testOnly("test-user"),
  }),
  MQTT_PASSWORD: str({
    desc: "MQTTパスワード",
    default: undefined,
    devDefault: testOnly("test-password"),
  }),
  MQTT_TASK_INTERVAL: num({ desc: "MQTTタスク実行間隔", default: 100 }),
  LOG_LEVEL: str({ desc: "ログレベル", default: "info" }),
  HA_DISCOVERY_PREFIX: str({
    desc: "https://www.home-assistant.io/integrations/mqtt/#discovery-options",
    default: "homeassistant",
  }),
  ECHONETLITE2MQTT_BASE_TOPIC: str({
    desc: "https://github.com/banban525/echonetlite2mqtt MQTT_BASE_TOPIC",
    default: "echonetlite2mqtt/elapi/v2/devices",
  }),
  PORT: port({
    desc: "HTTPサーバーのポート",
    default: 3000,
    devDefault: testOnly(0),
  }),
  DESCRIPTION_LANGUAGE: str({
    desc: "言語",
    choices: ["ja", "en"],
    default: "ja",
  }),
  AUTO_REQUEST_INTERVAL: num({
    desc: "定期的に自動リクエストする間隔",
    default: 60000,
    devDefault: testOnly(100),
  }),
});

export default env;
