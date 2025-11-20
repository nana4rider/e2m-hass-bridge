import env from "@/env";
import {
  getCompositeComponentConfigs,
  getSimpleComponentConfigs,
} from "@/payload/builder";
import type {
  CompositeComponentConfig,
  SimpleComponentConfig,
} from "@/payload/payloadType";
import initializeHttpServer from "@/service/http";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";
import type { Writable } from "type-fest";
import type { Mock } from "vitest";

vi.mock("@/payload/builder", () => {
  return {
    getCompositeComponentConfigs: vi.fn(),
    getSimpleComponentConfigs: vi.fn(),
  };
});

vi.mock("@/util/deviceUtil", () => {
  return {
    getAutoRequestProperties: vi.fn(),
  };
});

const writableEnv: Writable<typeof env> = env;

describe("initializeHttpServer", () => {
  let server: Awaited<ReturnType<typeof initializeHttpServer>>;
  const mockTaskQueueSize = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    writableEnv.PORT = 0;
    server = await initializeHttpServer(
      new Map<string, ApiDevice>([
        ["id", { id: "deviceId", name: "deviceName" } as ApiDevice],
      ]),
      mockTaskQueueSize,
    );
  });

  afterEach(async () => {
    await server.close();
  });

  test("/health エンドポイントでヘルスステータスが返されること", async () => {
    const response = await fetch(`http://localhost:${server.port}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      uptime: expect.any(Number) as number,
      timestamp: expect.any(Number) as number,
    });
  });

  test("/status エンドポイントでデバイス情報が返されること", async () => {
    mockTaskQueueSize.mockReturnValue(10);
    (
      getCompositeComponentConfigs as Mock<
        (apiDevice: ApiDevice) => CompositeComponentConfig[]
      >
    ).mockReturnValue([
      {
        compositeComponentId: "climate",
        builder: () => ({}),
        component: "climate",
      },
    ]);
    (
      getSimpleComponentConfigs as Mock<
        (apiDevice: ApiDevice) => SimpleComponentConfig[]
      >
    ).mockReturnValue([
      {
        component: "binary_sensor",
        property: {
          name: "foo",
        } as ApiDeviceProperty,
        builder: () => ({}),
      },
    ]);
    (
      getAutoRequestProperties as Mock<(apiDevice: ApiDevice) => string[]>
    ).mockReturnValue(["foo", "bar", "baz"]);

    const response = await fetch(`http://localhost:${server.port}/status`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      devices: [
        {
          id: "deviceId",
          compositeComponents: [
            {
              component: "climate",
              compositeComponentId: "climate",
            },
          ],
          simpleComponents: [{ component: "binary_sensor", name: "foo" }],
          autoRequestProperties: ["foo", "bar", "baz"],
        },
      ],
      taskQueueSize: 10,
    });
  });

  test("その他のパスは404を返すこと", async () => {
    const response = await fetch(`http://localhost:${server.port}/foo`, {
      method: "POST",
    });

    expect(response.status).toBe(404);
  });

  test("サーバーの立ち上げに失敗した場合は例外をスローすること", async () => {
    // 同じポートで2つ目のHTTPサーバーを立ち上げる
    writableEnv.PORT = server.port;

    await expect(
      initializeHttpServer(new Map(), vi.fn()),
    ).rejects.toThrowError();
  });
});
