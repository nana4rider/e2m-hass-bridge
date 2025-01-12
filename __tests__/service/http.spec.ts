import initializeHttpServer from "@/service/http";
import http, { IncomingMessage, Server, ServerResponse } from "http";

const mockListen = jest.fn<
  void,
  [port: number, callback: (err?: Error) => void]
>();
const mockClose = jest.fn<void, [callback: (err?: Error) => void]>();

jest.mock("http", () => {
  return {
    createServer: jest.fn(),
  };
});

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe("initializeHttpServer", () => {
  test("listenに失敗すると例外をスロー", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback(new Error("test error"));
    });

    const mockCreateServer = http.createServer as jest.Mock;

    mockCreateServer.mockReturnValue({
      listen: mockListen,
      close: mockClose,
    } as unknown as Server);

    const actual = initializeHttpServer();

    await expect(actual).rejects.toThrow("test error");
  });

  test("listenに成功すると正常終了", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback();
    });

    const mockCreateServer = http.createServer as jest.Mock;

    mockCreateServer.mockReturnValue({
      listen: mockListen,
      close: mockClose,
    });

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

    const mockCreateServer = http.createServer as jest.Mock;

    mockCreateServer.mockReturnValue({
      listen: mockListen,
      close: mockClose,
    });

    const { close } = await initializeHttpServer();
    await close();

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test("ヘルスチェックが200を返す", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback();
    });

    const mockCreateServer = http.createServer as jest.Mock;

    let requestHandler!: http.RequestListener;
    mockCreateServer.mockImplementation((handler) => {
      requestHandler = handler as http.RequestListener;
      return {
        listen: mockListen,
        close: mockClose,
      };
    });

    await initializeHttpServer();

    const mockReq = { url: "/health" } as IncomingMessage;
    const mockRes = {
      end: jest.fn(),
      writeHead: jest.fn(),
    } as unknown as ServerResponse;

    requestHandler(mockReq, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({}));
  });

  test("setEndpointで登録したエンドポイントが正しいレスポンスを返す", async () => {
    mockListen.mockImplementation((port, callback) => {
      callback();
    });

    const mockCreateServer = http.createServer as jest.Mock;

    let requestHandler!: http.RequestListener;
    mockCreateServer.mockImplementation((handler) => {
      requestHandler = handler as http.RequestListener;
      return {
        listen: mockListen,
        close: mockClose,
      };
    });

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

    const mockCreateServer = http.createServer as jest.Mock;

    let requestHandler!: http.RequestListener;
    mockCreateServer.mockImplementation((handler) => {
      requestHandler = handler as http.RequestListener;
      return {
        listen: mockListen,
        close: mockClose,
      };
    });

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
