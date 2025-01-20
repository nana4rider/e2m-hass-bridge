import env from "@/env";
import {
  getCompositeComponentConfigs,
  getSimpleComponentConfigs,
} from "@/payload/builder";
import {
  CompositeComponentConfig,
  SimpleComponentConfig,
} from "@/payload/payloadType";
import initializeHttpServer from "@/service/http";
import { getAutoRequestProperties } from "@/util/deviceUtil";
import type {
  ApiDevice,
  ApiDeviceProperty,
} from "echonetlite2mqtt/server/ApiTypes";
import { FastifyInstance } from "fastify";
import { MutableEnv } from "jest.setup";

jest.mock("@/payload/builder", () => {
  return {
    getCompositeComponentConfigs: jest.fn(),
    getSimpleComponentConfigs: jest.fn(),
  };
});

jest.mock("@/util/deviceUtil", () => {
  return {
    getAutoRequestProperties: jest.fn(),
  };
});

describe("initializeHttpServer", () => {
  let server: FastifyInstance;
  const mockTaskQueueSize = jest.fn();

  beforeEach(async () => {
    (env as MutableEnv).PORT = undefined;
    jest.clearAllMocks();

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
      getCompositeComponentConfigs as jest.Mock<CompositeComponentConfig[]>
    ).mockReturnValue([
      {
        compositeComponentId: "climate",
        builder: () => ({}),
        component: "climate",
      },
    ]);
    (
      getSimpleComponentConfigs as jest.Mock<SimpleComponentConfig[]>
    ).mockReturnValue([
      {
        component: "binary_sensor",
        property: {
          name: "foo",
        } as ApiDeviceProperty,
        builder: () => ({}),
      },
    ]);
    (getAutoRequestProperties as jest.Mock<string[]>).mockReturnValue([
      "foo",
      "bar",
      "baz",
    ]);

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
