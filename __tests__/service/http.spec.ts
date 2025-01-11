import { jest } from "@jest/globals";
import { IncomingMessage, ServerResponse } from "http";

const mockListen: jest.Mock<
  (this: void, port: number, callback: (err?: Error) => void) => void
> = jest.fn();
const mockClose =
  jest.fn<(this: void, callback: (err?: Error) => void) => void>();
const mockCreateServer: jest.Mock<
  (handler: (req: IncomingMessage, res: ServerResponse) => void) => {
    listen: typeof mockListen;
    close: typeof mockClose;
  }
> = jest.fn();

jest.unstable_mockModule("http", () => {
  return {
    createServer: mockCreateServer,
  };
});

const env = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...env };
});

describe("initializeHttpServer", () => {
  test("listenに失敗すると例外をスロー", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback(new Error("test error"));
    });
    mockCreateServer.mockReturnValue({
      listen: mockListen,
      close: mockClose,
    });

    const { default: initializeHttpServer } = await import("@/service/http");
    const actual = initializeHttpServer();

    await expect(actual).rejects.toThrow("test error");
  });

  test("listenに成功すると正常終了", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback();
    });
    mockCreateServer.mockReturnValue({
      listen: mockListen,
      close: mockClose,
    });

    const { default: initializeHttpServer } = await import("@/service/http");
    await initializeHttpServer();

    expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
  });

  test("closeを呼び出すとhttp.closeが実行される", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback();
    });
    mockClose.mockImplementation((callback) => {
      callback();
    });
    mockCreateServer.mockReturnValue({
      listen: mockListen,
      close: mockClose,
    });

    const { default: initializeHttpServer } = await import("@/service/http");
    const { close } = await initializeHttpServer();
    await close();

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test("setEndpointで登録したエンドポイントが正しいレスポンスを返す", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback();
    });

    let requestHandler!: (req: IncomingMessage, res: ServerResponse) => void;

    mockCreateServer.mockImplementation((handler) => {
      requestHandler = handler;
      return {
        listen: mockListen,
        close: mockClose,
      };
    });

    const { default: initializeHttpServer } = await import("@/service/http");
    const { setEndpoint } = await initializeHttpServer();

    setEndpoint("/test", () => ({ message: "Hello, world!" }));

    const mockReq = { url: "/test" } as IncomingMessage;
    const mockRes = {
      end: jest.fn(),
      writeHead: jest.fn(),
    } as unknown as ServerResponse;

    requestHandler(mockReq, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(mockRes.end).toHaveBeenCalledWith(
      JSON.stringify({ message: "Hello, world!" }),
    );
  });

  test("setEndpointで登録されていないエンドポイントは404を返す", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback();
    });

    let requestHandler!: (req: IncomingMessage, res: ServerResponse) => void;

    mockCreateServer.mockImplementation((handler) => {
      requestHandler = handler;
      return {
        listen: mockListen,
        close: mockClose,
      };
    });

    const { default: initializeHttpServer } = await import("@/service/http");
    await initializeHttpServer();

    const mockReq = { url: "/not-found" } as IncomingMessage;
    const mockRes = {
      end: jest.fn(),
      writeHead: jest.fn(),
    } as unknown as ServerResponse;

    requestHandler(mockReq, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(404, {
      "Content-Type": "application/json",
    });
    expect(mockRes.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "Not Found" }),
    );
  });
});
