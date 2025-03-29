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
import type { FastifyInstance } from "fastify";
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

describe("initializeHttpServer", () => {
  let server: FastifyInstance;
  const mockTaskQueueSize = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

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
    const response = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
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

    const response = await server.inject({
      method: "GET",
      url: "/status",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
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
});
