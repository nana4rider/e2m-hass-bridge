import env from "env-var";
import { createLogger, format, transports } from "winston";

const LOG_LEVEL = env.get("LOG_LEVEL").default("info").asString();

const logger = createLogger({
  level: LOG_LEVEL,
  format: format.combine(
    format.errors({ stack: true }),
    format.colorize(),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ timestamp, level, message, stack }) => {
      let log = `[${timestamp as string}] [${level}]: ${message as string}`;
      if (typeof stack === "string") {
        log = `${log}\n${stack}`;
      }
      return log;
    }),
  ),
  transports: [
    new transports.Console({
      stderrLevels: ["warn", "error"],
    }),
  ],
});

export default logger;
