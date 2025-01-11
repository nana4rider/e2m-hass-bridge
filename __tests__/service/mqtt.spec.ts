import { jest } from "@jest/globals";
import {
  IPublishPacket,
  MqttClient,
  MqttClientEventCallbacks,
  OnMessageCallback,
} from "mqtt";
import { setTimeout } from "timers/promises";

const mockConnectAsync = jest.fn();
const mockSubscribeAsync = jest.fn();
const mockPublishAsync = jest.fn();
const mockEndAsync = jest.fn();
const mockOn =
  jest.fn<
    (
      event: keyof MqttClientEventCallbacks,
      callback: MqttClientEventCallbacks[keyof MqttClientEventCallbacks],
    ) => MqttClient
  >();

jest.unstable_mockModule("mqtt", () => ({
  default: {
    connectAsync: mockConnectAsync,
  },
}));

const env = process.env;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  process.env = { ...env };
  process.env.MQTT_BROKER = "mtqq:/localhost";
  process.env.MQTT_USERNAME = "username";
  process.env.MQTT_PASSWORD = "password";
});

describe("initializeMqttClient", () => {
  test("MQTTクライアントが正常に接続される", async () => {
    // モックの設定
    mockConnectAsync.mockReturnValue(
      Promise.resolve({
        subscribeAsync: mockSubscribeAsync,
        publishAsync: mockPublishAsync,
        endAsync: mockEndAsync,
        on: mockOn,
      }),
    );

    const { default: initializeMqttClient } = await import("@/service/mqtt");

    const mockHandleMessage =
      jest.fn<(topic: string, message: string) => void>();
    await initializeMqttClient(["topic/test"], mockHandleMessage);

    // MQTTクライアントの接続確認
    expect(mockConnectAsync).toHaveBeenCalledWith(
      process.env.MQTT_BROKER,
      expect.objectContaining({
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
      }),
    );

    // トピックのサブスクライブ確認
    expect(mockSubscribeAsync).toHaveBeenCalledWith(["topic/test"]);
  });

  test("メッセージを受信するとhandleMessageが呼ばれる", async () => {
    const mockPayload = Buffer.from("test message");
    mockConnectAsync.mockReturnValue(
      Promise.resolve({
        subscribeAsync: mockSubscribeAsync,
        publishAsync: mockPublishAsync,
        endAsync: mockEndAsync,
        on: mockOn,
      }),
    );

    const { default: initializeMqttClient } = await import("@/service/mqtt");

    const mockHandleMessage =
      jest.fn<(topic: string, message: string) => void>();
    await initializeMqttClient(["topic/test"], mockHandleMessage);

    // メッセージイベントをトリガー
    const onMessageCallback = mockOn.mock.calls.find(
      ([event]) => event === "message",
    )?.[1] as OnMessageCallback;
    onMessageCallback?.("topic/test", mockPayload, {} as IPublishPacket);

    // handleMessageが正しく呼び出されたか確認
    expect(mockHandleMessage).toHaveBeenCalledWith(
      "topic/test",
      "test message",
    );
  });

  test("handleMessageで同期エラーが発生しても例外をスローしない", async () => {
    const mockPayload = Buffer.from("test message");
    mockConnectAsync.mockReturnValue(
      Promise.resolve({
        subscribeAsync: mockSubscribeAsync,
        publishAsync: mockPublishAsync,
        endAsync: mockEndAsync,
        on: mockOn,
      }),
    );

    const { default: initializeMqttClient } = await import("@/service/mqtt");

    const mockHandleMessage =
      jest.fn<(topic: string, message: string) => void>();
    mockHandleMessage.mockImplementation(() => {
      throw new Error("test error");
    });

    await initializeMqttClient(["topic/test"], mockHandleMessage);

    const onMessageCallback = mockOn.mock.calls.find(
      ([event]) => event === "message",
    )?.[1] as OnMessageCallback;

    // トリガーしても例外が発生しないことを確認
    expect(() => {
      onMessageCallback?.("topic/test", mockPayload, {} as IPublishPacket);
    }).not.toThrow();
  });

  test("handleMessageで非同期エラーが発生しても例外をスローしない", async () => {
    const mockPayload = Buffer.from("test message");
    mockConnectAsync.mockReturnValue(
      Promise.resolve({
        subscribeAsync: mockSubscribeAsync,
        publishAsync: mockPublishAsync,
        endAsync: mockEndAsync,
        on: mockOn,
      }),
    );

    const { default: initializeMqttClient } = await import("@/service/mqtt");

    const mockHandleMessage =
      jest.fn<(topic: string, message: string) => Promise<void>>();
    mockHandleMessage.mockImplementation(() =>
      Promise.reject(new Error("test error")),
    );

    await initializeMqttClient(["topic/test"], mockHandleMessage);

    const onMessageCallback = mockOn.mock.calls.find(
      ([event]) => event === "message",
    )?.[1] as OnMessageCallback;

    // トリガーしても例外が発生しないことを確認
    expect(() => {
      onMessageCallback?.("topic/test", mockPayload, {} as IPublishPacket);
    }).not.toThrow();
  });

  test("publishがタスクキューに追加される", async () => {
    mockConnectAsync.mockReturnValue(
      Promise.resolve({
        subscribeAsync: mockSubscribeAsync,
        publishAsync: mockPublishAsync,
        endAsync: mockEndAsync,
        on: mockOn,
      }),
    );

    const { default: initializeMqttClient } = await import("@/service/mqtt");

    const mqtt = await initializeMqttClient(
      ["topic/test"],
      jest.fn<(topic: string, message: string) => void>(),
    );

    // publishを呼び出す
    mqtt.publish("topic/publish", "test message", { retain: true });

    // タスクキューの状態を確認
    expect(mqtt.taskQueueSize).toBe(1);
  });

  test("addSubscribeがタスクキューに追加される", async () => {
    mockConnectAsync.mockReturnValue(
      Promise.resolve({
        subscribeAsync: mockSubscribeAsync,
        publishAsync: mockPublishAsync,
        endAsync: mockEndAsync,
        on: mockOn,
      }),
    );

    const { default: initializeMqttClient } = await import("@/service/mqtt");

    const mqtt = await initializeMqttClient(["topic/test"], () => {});

    // addSubscribeを呼び出す
    mqtt.addSubscribe("topic/new");

    // タスクキューの状態を確認
    expect(mqtt.taskQueueSize).toBe(1);
  });

  test("close(true)を呼び出すとタスクキューが空になりクライアントが終了する", async () => {
    mockConnectAsync.mockReturnValue(
      Promise.resolve({
        subscribeAsync: mockSubscribeAsync,
        publishAsync: mockPublishAsync,
        endAsync: mockEndAsync,
        on: mockOn,
      }),
    );
    mockPublishAsync.mockImplementation(async () => {
      await setTimeout(100);
      return Promise.resolve();
    });

    const { default: initializeMqttClient } = await import("@/service/mqtt");

    const mqtt = await initializeMqttClient(["topic/test"], () => {});

    mqtt.publish("topic", "message");

    // closeを呼び出す
    await mqtt.close(true);

    // タスクキューが空になっていることを確認
    expect(mqtt.taskQueueSize).toBe(0);

    // MQTTクライアントの終了を確認
    expect(mockEndAsync).toHaveBeenCalledTimes(1);
  });

  test("close()を呼び出すとタスクキューが残っていてもクライアントが終了する", async () => {
    mockConnectAsync.mockReturnValue(
      Promise.resolve({
        subscribeAsync: mockSubscribeAsync,
        publishAsync: mockPublishAsync,
        endAsync: mockEndAsync,
        on: mockOn,
      }),
    );
    mockPublishAsync.mockImplementation(async () => {
      await setTimeout(100);
      return Promise.resolve();
    });

    const { default: initializeMqttClient } = await import("@/service/mqtt");

    const mqtt = await initializeMqttClient(
      ["topic/test"],
      jest.fn<(topic: string, message: string) => void>(),
    );

    mqtt.publish("topic", "message");

    // closeを呼び出す
    await mqtt.close();

    // タスクキューが空になっていないことを確認
    expect(mqtt.taskQueueSize).toBe(1);

    // MQTTクライアントの終了を確認
    expect(mockEndAsync).toHaveBeenCalledTimes(1);
  });
});
