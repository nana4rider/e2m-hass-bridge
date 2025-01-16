import { cleanEnv, num, port, str } from "envalid";

const env = cleanEnv(process.env, {
  MQTT_BROKER: str({ desc: "MQTTブローカー", example: "mqtt://localhost" }),
  MQTT_USERNAME: str({ desc: "MQTTユーザ名", default: undefined }),
  MQTT_PASSWORD: str({ desc: "MQTTパスワード", default: undefined }),
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
  }),
  DESCRIPTION_LANGUAGE: str({
    desc: "言語",
    choices: ["ja", "en"],
    default: "ja",
  }),
  AUTO_REQUEST_INTERVAL: num({
    desc: "定期的に自動リクエストする間隔",
    default: 60000,
  }),
});

export default env;
