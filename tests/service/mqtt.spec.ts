import env from "@/env";
import initializeMqttClient from "@/service/mqtt";
import type { IPublishPacket, MqttClient, OnMessageCallback } from "mqtt";
import mqttjs from "mqtt";
import { name as packageName } from "package.json";
import { setTimeout } from "timers/promises";

const mockSubscribeAsync = vi.fn();
const mockPublishAsync = vi.fn();
const mockEndAsync = vi.fn();
const mockOn = vi.fn();

const mockHandleMessage = vi.fn();

vi.mock("mqtt", () => ({
  default: {
    connectAsync: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();

  const mockMqttClient: Partial<MqttClient> = {
    subscribeAsync: mockSubscribeAsync,
    publishAsync: mockPublishAsync,
    endAsync: mockEndAsync,
    on: mockOn,
  };
  vi.mocked(mqttjs.connectAsync).mockResolvedValue(
    mockMqttClient as MqttClient,
  );
});

describe("initializeMqttClient", () => {
  test("MQTTクライアントが正常に接続される", async () => {
    const mqtt = await initializeMqttClient(["topic/test"], mockHandleMessage);

    await mqtt.close();

    // MQTTクライアントの接続確認
    expect(mqttjs.connectAsync).toHaveBeenCalledWith(
      env.MQTT_BROKER,
      expect.objectContaining({
        clientId: expect.stringMatching(
          `^${packageName}_[0-9a-z]{8}$`,
        ) as string,
        username: env.MQTT_USERNAME,
        password: env.MQTT_PASSWORD,
      }),
    );

    // トピックのサブスクライブ確認
    expect(mockSubscribeAsync).toHaveBeenCalledWith(["topic/test"]);
  });

  test("メッセージを受信するとhandleMessageが呼ばれる", async () => {
    const mockPayload = Buffer.from("test message");

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
    const mqtt = await initializeMqttClient(["topic/test"], mockHandleMessage);

    // publishを呼び出す
    mqtt.publish("topic/publish", "test message", { retain: true });

    // タスクキューの状態を確認
    expect(mqtt.taskQueueSize).toBe(1);

    await mqtt.close(true);
  });

  test("addSubscribeがタスクキューに追加される", async () => {
    const mqtt = await initializeMqttClient(["topic/test"], () => {});

    // addSubscribeを呼び出す
    mqtt.addSubscribe("topic/new");

    // タスクキューの状態を確認
    expect(mqtt.taskQueueSize).toBe(1);

    await mqtt.close(true);
  });

  test("close(true)を呼び出すとタスクキューが空になりクライアントが終了する", async () => {
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
    mockPublishAsync.mockImplementation(async () => {
      await setTimeout(100);
      return Promise.resolve();
    });

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
