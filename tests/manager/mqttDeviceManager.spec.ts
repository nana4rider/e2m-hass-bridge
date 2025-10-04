import env from "@/env";
import logger from "@/logger";
import setupMqttDeviceManager from "@/manager/mqttDeviceManager";
import {
  buildDevice,
  buildDiscoveryEntries,
  buildOrigin,
} from "@/payload/builder";
import type { MqttClient } from "@/service/mqtt";
import initializeMqttClient from "@/service/mqtt";
import { parseJson } from "@/util/dataTransformUtil";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceSummary,
} from "echonetlite2mqtt/server/ApiTypes";
import type { Mock } from "vitest";

vi.mock("@/payload/builder", () => ({
  buildDevice: vi.fn(),
  buildOrigin: vi.fn(),
  buildDiscoveryEntries: vi.fn(),
}));

vi.mock("@/service/mqtt", () => ({
  default: vi.fn(),
}));

vi.mock("@/util/dataTransformUtil", () => ({
  parseJson: vi.fn(),
}));

vi.mock("@/util/deviceUtil", () => ({
  getAutoRequestProperties: vi.fn(),
}));

describe("setupMqttDeviceManager", () => {
  const mockMqttClient: MqttClient = {
    publish: vi.fn(),
    taskQueueSize: 0,
    addSubscribe: vi.fn(),
    close: vi.fn(),
    setMessageHandler: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(initializeMqttClient).mockResolvedValue(mockMqttClient);
    vi.mocked(buildOrigin).mockReturnValue({ origin: "test-origin" });
    vi.mocked(buildDevice).mockReturnValue({ device: "test-device" });
    vi.mocked(buildDiscoveryEntries).mockImplementation(
      (apiDevice: ApiDevice) => [
        {
          relativeTopic: `${apiDevice.id}/config`,
          payload: { unique_id: `${apiDevice.id}_unique` },
        },
      ],
    );
    (parseJson as Mock).mockImplementation(JSON.parse);
    (getAutoRequestProperties as Mock).mockReturnValue([
      "property1",
      "property2",
    ]);
  });

  test("初期化時にBaseTopicが購読される", async () => {
    const targetDevices = new Map<string, ApiDevice>();

    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    expect(mockMqttClient.addSubscribe).toHaveBeenCalledExactlyOnceWith(
      env.ECHONETLITE2MQTT_BASE_TOPIC,
    );
  });

  test("デバイスリストを処理し、新しいトピックを購読する", async () => {
    const targetDevices = new Map<string, ApiDevice>();
    const apiDeviceSummaries = [
      { deviceType: "type1", mqttTopics: "topic1" },
      { deviceType: "type2", mqttTopics: "topic2" },
    ] as ApiDeviceSummary[];

    const handleMessage = vi.fn();
    vi.mocked(initializeMqttClient).mockImplementation(() => {
      return Promise.resolve({
        ...mockMqttClient,
        setMessageHandler: (
          handler: (topic: string, message: string) => void,
        ) => {
          handleMessage.mockImplementation(handler);
        },
      });
    });

    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    handleMessage(
      env.ECHONETLITE2MQTT_BASE_TOPIC,
      JSON.stringify(apiDeviceSummaries),
    );

    expect(mockMqttClient.addSubscribe).toHaveBeenNthCalledWith(
      1,
      env.ECHONETLITE2MQTT_BASE_TOPIC,
    );
    expect(mockMqttClient.addSubscribe).toHaveBeenNthCalledWith(2, "topic1");
    expect(mockMqttClient.addSubscribe).toHaveBeenNthCalledWith(3, "topic2");
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

    const setMessageHandlerCall = vi.mocked(mockMqttClient.setMessageHandler)
      .mock.calls[0];
    const handleMessage = setMessageHandlerCall[0];

    await handleMessage(
      env.ECHONETLITE2MQTT_BASE_TOPIC,
      JSON.stringify(apiDeviceSummaries),
    );
    await handleMessage("topic1", JSON.stringify(apiDevice));

    expect(mockMqttClient.publish).toHaveBeenCalledExactlyOnceWith(
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

    expect(mockMqttClient.publish).toHaveBeenCalledExactlyOnceWith(
      "topic1/properties/request",
      JSON.stringify({ property1: "", property2: "" }),
    );
  });

  test("未知のトピックは無視する", async () => {
    const targetDevices = new Map<string, ApiDevice>();
    const handleMessage = vi.fn();
    vi.mocked(initializeMqttClient).mockImplementation(() => {
      return Promise.resolve({
        ...mockMqttClient,
        setMessageHandler: (
          handler: (topic: string, message: string) => void,
        ) => {
          handleMessage.mockImplementation(handler);
        },
      });
    });

    const logErrorSpy = vi.spyOn(logger, "error");
    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    handleMessage("unknown/topic", "unknown");

    expect(logErrorSpy).toHaveBeenCalledExactlyOnceWith(
      "[MQTT] unknown topic: unknown/topic, message: unknown",
    );
  });

  test("除外パターンに一致するデバイスは購読されない", async () => {
    const targetDevices = new Map<string, ApiDevice>();
    const apiDeviceSummaries = [
      { deviceType: "Unknown_1", mqttTopics: "ignoredTopic" },
    ] as ApiDeviceSummary[];

    const handleMessage = vi.fn();
    vi.mocked(initializeMqttClient).mockImplementation(() => {
      return Promise.resolve({
        ...mockMqttClient,
        setMessageHandler: (
          handler: (topic: string, message: string) => void,
        ) => {
          handleMessage.mockImplementation(handler);
        },
      });
    });

    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    handleMessage(
      env.ECHONETLITE2MQTT_BASE_TOPIC,
      JSON.stringify(apiDeviceSummaries),
    );

    expect(mockMqttClient.addSubscribe).not.toHaveBeenCalledExactlyOnceWith(
      "ignoredTopic",
    );
  });

  test("自動リクエスト中にエラーが発生した場合ログに記録される", async () => {
    const targetDevices = new Map<string, ApiDevice>([
      ["device1", { id: "device1", mqttTopics: "topic1" } as ApiDevice],
    ]);

    vi.mocked(mockMqttClient.publish).mockImplementation(() => {
      throw new Error("Publish failed");
    });

    const logErrorSpy = vi.spyOn(logger, "error");
    const { stopAutoRequest } = await setupMqttDeviceManager(targetDevices);
    await stopAutoRequest();

    expect(logErrorSpy).toHaveBeenCalledExactlyOnceWith(
      "Failed to auto request",
      expect.any(Error),
    );
  });
});
