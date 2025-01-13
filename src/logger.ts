import env from "@/env";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: env.LOG_LEVEL,
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
