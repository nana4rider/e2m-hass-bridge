import env from "@/env";
import initializeMqttClient from "@/service/mqtt";
import mqttjs, { IPublishPacket, MqttClient, OnMessageCallback } from "mqtt";
import { setTimeout } from "timers/promises";
import { Mock } from "vitest";

// 必要なモック関数
const mockSubscribeAsync = vi.fn();
const mockPublishAsync = vi.fn();
const mockEndAsync = vi.fn();
const mockOn = vi.fn<MqttClient["on"]>();

vi.mock("mqtt", () => ({
  default: {
    connectAsync: vi.fn(),
  },
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("initializeMqttClient", () => {
  test("MQTTクライアントが正常に接続される", async () => {
    const mockConnectAsync = mqttjs.connectAsync as Mock;
    mockConnectAsync.mockResolvedValue({
      subscribeAsync: mockSubscribeAsync,
      publishAsync: mockPublishAsync,
      endAsync: mockEndAsync,
      on: mockOn,
    });

    const mockHandleMessage = vi.fn();
    const mqtt = await initializeMqttClient(["topic/test"], mockHandleMessage);

    await mqtt.close();

    // MQTTクライアントの接続確認
    expect(mockConnectAsync).toHaveBeenCalledWith(
      env.MQTT_BROKER,
      expect.objectContaining({
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD,
      }),
    );

    // トピックのサブスクライブ確認
    expect(mockSubscribeAsync).toHaveBeenCalledWith(["topic/test"]);
  });

  test("メッセージを受信するとhandleMessageが呼ばれる", async () => {
    const mockPayload = Buffer.from("test message");
    const mockConnectAsync = mqttjs.connectAsync as Mock;
    mockConnectAsync.mockResolvedValue({
      subscribeAsync: mockSubscribeAsync,
      publishAsync: mockPublishAsync,
      endAsync: mockEndAsync,
      on: mockOn,
    });

    const mockHandleMessage = vi.fn();
    const mqtt = await initializeMqttClient(["topic/test"], mockHandleMessage);

    // メッセージイベントをトリガー
    const onMessageCallback = mockOn.mock.calls.find(
      ([event]) => event === "message",
    )?.[1] as OnMessageCallback;
    onMessageCallback?.("topic/test", mockPayload, {} as IPublishPacket);

    await mqtt.close();

    // handleMessageが正しく呼び出されたか確認
    expect(mockHandleMessage).toHaveBeenCalledWith(
      "topic/test",
      "test message",
    );
  });

  test("handleMessageで同期エラーが発生しても例外をスローしない", async () => {
    const mockPayload = Buffer.from("test message");
    const mockConnectAsync = mqttjs.connectAsync as Mock;
    mockConnectAsync.mockResolvedValue({
      subscribeAsync: mockSubscribeAsync,
      publishAsync: mockPublishAsync,
      endAsync: mockEndAsync,
      on: mockOn,
    });

    const mockHandleMessage = vi.fn();
    mockHandleMessage.mockImplementation(() => {
      throw new Error("test error");
    });

    const mqtt = await initializeMqttClient(["topic/test"], mockHandleMessage);

    const onMessageCallback = mockOn.mock.calls.find(
      ([event]) => event === "message",
    )?.[1] as OnMessageCallback;

    await mqtt.close();

    // トリガーしても例外が発生しないことを確認
    expect(() => {
      onMessageCallback?.("topic/test", mockPayload, {} as IPublishPacket);
    }).not.toThrow();
  });

  test("handleMessageで非同期エラーが発生しても例外をスローしない", async () => {
    const mockPayload = Buffer.from("test message");
    const mockConnectAsync = mqttjs.connectAsync as Mock;
    mockConnectAsync.mockResolvedValue({
      subscribeAsync: mockSubscribeAsync,
      publishAsync: mockPublishAsync,
      endAsync: mockEndAsync,
      on: mockOn,
    });

    const mockHandleMessage = vi.fn();
    mockHandleMessage.mockImplementation(() =>
      Promise.reject(new Error("test error")),
    );

    const mqtt = await initializeMqttClient(["topic/test"], mockHandleMessage);

    const onMessageCallback = mockOn.mock.calls.find(
      ([event]) => event === "message",
    )?.[1] as OnMessageCallback;

    // トリガーしても例外が発生しないことを確認
    expect(() => {
      onMessageCallback?.("topic/test", mockPayload, {} as IPublishPacket);
    }).not.toThrow();

    await mqtt.close();
  });

  test("publishがタスクキューに追加される", async () => {
    const mockConnectAsync = mqttjs.connectAsync as Mock;
    mockConnectAsync.mockResolvedValue({
      subscribeAsync: mockSubscribeAsync,
      publishAsync: mockPublishAsync,
      endAsync: mockEndAsync,
      on: mockOn,
    });

    const mockHandleMessage = vi.fn();
    const mqtt = await initializeMqttClient(["topic/test"], mockHandleMessage);

    // publishを呼び出す
    mqtt.publish("topic/publish", "test message", { retain: true });

    // タスクキューの状態を確認
    expect(mqtt.taskQueueSize).toBe(1);

    await mqtt.close(true);
  });

  test("addSubscribeがタスクキューに追加される", async () => {
    const mockConnectAsync = mqttjs.connectAsync as Mock;
    mockConnectAsync.mockResolvedValue({
      subscribeAsync: mockSubscribeAsync,
      publishAsync: mockPublishAsync,
      endAsync: mockEndAsync,
      on: mockOn,
    });

    const mqtt = await initializeMqttClient(["topic/test"], () => {});

    // addSubscribeを呼び出す
    mqtt.addSubscribe("topic/new");

    // タスクキューの状態を確認
    expect(mqtt.taskQueueSize).toBe(1);

    await mqtt.close(true);
  });

  test("close(true)を呼び出すとタスクキューが空になりクライアントが終了する", async () => {
    const mockConnectAsync = mqttjs.connectAsync as Mock;
    mockConnectAsync.mockResolvedValue({
      subscribeAsync: mockSubscribeAsync,
      publishAsync: mockPublishAsync,
      endAsync: mockEndAsync,
      on: mockOn,
    });
    mockPublishAsync.mockImplementation(async () => {
      await setTimeout(100);
      return Promise.resolve();
    });

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
    const mockConnectAsync = mqttjs.connectAsync as Mock;
    mockConnectAsync.mockResolvedValue({
      subscribeAsync: mockSubscribeAsync,
      publishAsync: mockPublishAsync,
      endAsync: mockEndAsync,
      on: mockOn,
    });
    mockPublishAsync.mockImplementation(async () => {
      await setTimeout(100);
      return Promise.resolve();
    });

    const mockHandleMessage = vi.fn();
    const mqtt = await initializeMqttClient(["topic/test"], mockHandleMessage);

    mqtt.publish("topic", "message");

    // closeを呼び出す
    await mqtt.close();

    // タスクキューが空になっていないことを確認
    expect(mqtt.taskQueueSize).toBe(1);

    // MQTTクライアントの終了を確認
    expect(mockEndAsync).toHaveBeenCalledTimes(1);
  });
});
