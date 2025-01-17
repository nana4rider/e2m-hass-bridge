import env from "@/env";
import logger from "@/logger";
import setupMqttDeviceManager from "@/manager/mqttDeviceManager";
import {
  buildDevice,
  buildDiscoveryEntries,
  buildOrigin,
} from "@/payload/builder";
import initializeMqttClient from "@/service/mqtt";
import { parseJson } from "@/util/dataTransformUtil";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceSummary,
} from "echonetlite2mqtt/server/ApiTypes";

jest.mock("@/payload/builder", () => ({
  buildDevice: jest.fn(),
  buildDiscoveryEntries: jest.fn(),
  buildOrigin: jest.fn(),
}));

jest.mock("@/service/mqtt", () => jest.fn());

jest.mock("@/util/dataTransformUtil", () => ({
  parseJson: jest.fn(),
}));

jest.mock("@/util/deviceUtil", () => ({
  getAutoRequestProperties: jest.fn(),
}));

describe("setupMqttDeviceManager", () => {
  let mockMqttClient: { publish: jest.Mock; addSubscribe: jest.Mock };

  beforeEach(() => {
    jest.resetAllMocks();

    mockMqttClient = {
      publish: jest.fn(),
      addSubscribe: jest.fn(),
    };

    (initializeMqttClient as jest.Mock).mockResolvedValue(mockMqttClient);
    (buildOrigin as jest.Mock).mockResolvedValue({ origin: "test-origin" });
    (buildDevice as jest.Mock).mockReturnValue({ device: "test-device" });
    (buildDiscoveryEntries as jest.Mock).mockImplementation(
      (apiDevice: ApiDevice) => [
        {
          relativeTopic: `${apiDevice.id}/config`,
          payload: { unique_id: `${apiDevice.id}_unique` },
        },
      ],
    );
    (parseJson as jest.Mock).mockImplementation(JSON.parse);
    (getAutoRequestProperties as jest.Mock).mockReturnValue([
      "property1",
      "property2",
    ]);
  });

  test("初期化時にBaseTopicが購読される", async () => {
    const targetDevices = new Map<string, ApiDevice>();

    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    expect(initializeMqttClient).toHaveBeenCalledWith(
      [env.ECHONETLITE2MQTT_BASE_TOPIC],
      expect.any(Function),
    );
  });

  test("デバイスリストを処理し、新しいトピックを購読する", async () => {
    const targetDevices = new Map<string, ApiDevice>();
    const apiDeviceSummaries = [
      { deviceType: "type1", mqttTopics: "topic1" },
      { deviceType: "type2", mqttTopics: "topic2" },
    ] as ApiDeviceSummary[];

    const handleMessage = jest.fn<void, [topic: string, message: string]>();
    (initializeMqttClient as jest.Mock).mockImplementation(
      (_, handler: (topic: string, message: string) => void) => {
        handleMessage.mockImplementation(handler);
        return mockMqttClient;
      },
    );

    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    handleMessage(
      env.ECHONETLITE2MQTT_BASE_TOPIC,
      JSON.stringify(apiDeviceSummaries),
    );

    expect(mockMqttClient.addSubscribe).toHaveBeenCalledWith("topic1");
    expect(mockMqttClient.addSubscribe).toHaveBeenCalledWith("topic2");
  });

  test("Home Assistantにデバイス情報が送信される", async () => {
    const targetDevices = new Map<string, ApiDevice>();
    const apiDeviceSummaries = [
      { deviceType: "type1", mqttTopics: "topic1" },
      { deviceType: "type2", mqttTopics: "topic2" },
    ] as ApiDeviceSummary[];
    const apiDevice: ApiDevice = {
      id: "device1",
      mqttTopics: "topic1",
    } as ApiDevice;

    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    const handleMessage = (
      initializeMqttClient as jest.Mock<
        ReturnType<typeof initializeMqttClient>,
        Parameters<typeof initializeMqttClient>
      >
    ).mock.calls[0][1];

    await handleMessage(
      env.ECHONETLITE2MQTT_BASE_TOPIC,
      JSON.stringify(apiDeviceSummaries),
    );
    await handleMessage("topic1", JSON.stringify(apiDevice));

    expect(mockMqttClient.publish).toHaveBeenCalledWith(
      `${env.HA_DISCOVERY_PREFIX}/device1/config`,
      JSON.stringify({
        unique_id: "device1_unique",
        device: "test-device",
        origin: "test-origin",
      }),
      { qos: 1, retain: true },
    );
  });

  test("定期的な自動リクエストメッセージが送信される", async () => {
    const targetDevices = new Map<string, ApiDevice>([
      ["device1", { id: "device1", mqttTopics: "topic1" } as ApiDevice],
    ]);

    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    expect(mockMqttClient.publish).toHaveBeenCalledWith(
      "topic1/properties/request",
      JSON.stringify({ property1: "", property2: "" }),
    );
  });

  test("未知のトピックは無視する", async () => {
    const targetDevices = new Map<string, ApiDevice>();
    const handleMessage = jest.fn();
    (initializeMqttClient as jest.Mock).mockImplementation(
      (_, handler: (topic: string, message: string) => void) => {
        handleMessage.mockImplementation(handler);
        return mockMqttClient;
      },
    );

    const logErrorSpy = jest.spyOn(logger, "error");
    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    handleMessage("unknown/topic", "unknown");

    expect(logErrorSpy).toHaveBeenCalledWith(
      "[MQTT] unknown topic: unknown/topic, message: unknown",
    );
  });

  test("除外パターンに一致するデバイスは購読されない", async () => {
    const targetDevices = new Map<string, ApiDevice>();
    const apiDeviceSummaries = [
      { deviceType: "Unknown_1", mqttTopics: "ignoredTopic" },
    ] as ApiDeviceSummary[];

    const handleMessage = jest.fn();
    (initializeMqttClient as jest.Mock).mockImplementation(
      (_, handler: (topic: string, message: string) => void) => {
        handleMessage.mockImplementation(handler);
        return mockMqttClient;
      },
    );

    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    handleMessage(
      env.ECHONETLITE2MQTT_BASE_TOPIC,
      JSON.stringify(apiDeviceSummaries),
    );

    expect(mockMqttClient.addSubscribe).not.toHaveBeenCalledWith(
      "ignoredTopic",
    );
  });

  test("自動リクエスト中にエラーが発生した場合ログに記録される", async () => {
    const targetDevices = new Map<string, ApiDevice>([
      ["device1", { id: "device1", mqttTopics: "topic1" } as ApiDevice],
    ]);

    mockMqttClient.publish.mockImplementation(() => {
      throw new Error("Publish failed");
    });

    const logErrorSpy = jest.spyOn(logger, "error");
    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    expect(logErrorSpy).toHaveBeenCalledWith(
      "Failed to auto request",
      expect.any(Error),
    );
  });
});
