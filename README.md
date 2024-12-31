# ECHONETLite2MQTT Home Assistant Bridge

[ECHONETLite2MQTT](https://github.com/banban525/echonetlite2mqtt)で検出されたデバイスを、[Home Assistant](https://www.home-assistant.io/)のデバイスとして自動検出させるためのアプリケーションです。

## Usage

```sh
export MQTT_BROKER="mqtt://localhost"
export MQTT_USERNAME="username"
export MQTT_PASSWORD="password"
node dist/index
```
