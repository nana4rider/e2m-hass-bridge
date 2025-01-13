import { cleanEnv, num, str } from "envalid";

const env = cleanEnv(process.env, {
  // MQTT設定
  MQTT_BROKER: str(),
  MQTT_USERNAME: str({ default: undefined }),
  MQTT_PASSWORD: str({ default: undefined }),
  MQTT_TASK_INTERVAL: num({ default: 100 }),
  // ログ出力
  LOG_LEVEL: str({ default: "info" }),
  // https://www.home-assistant.io/integrations/mqtt/#discovery-options
  HA_DISCOVERY_PREFIX: str({ default: "homeassistant" }),
  // https://github.com/banban525/echonetlite2mqtt MQTT_BASE_TOPIC
  ECHONETLITE2MQTT_BASE_TOPIC: str({
    default: "echonetlite2mqtt/elapi/v2/devices",
  }),
  // HTTPサーバーのポート
  PORT: num({ default: 3000 }),
  // 言語
  DESCRIPTION_LANGUAGE: str({ choices: ["ja", "en"], default: "ja" }),
  // 定期的に自動リクエストする間隔
  AUTO_REQUEST_INTERVAL: num({ default: 60000 }),
});

export default env;
