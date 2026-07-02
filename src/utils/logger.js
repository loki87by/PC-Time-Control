import path from "path";
import winston from "winston";

import { CONFIG } from "#config";

const {maxsize, maxFiles, tsFormat, logFile} = CONFIG
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: tsFormat }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }),
);

export const logger = winston.createLogger({
  level: "debug",
  format: logFormat,
  transports: [
    new winston.transports.File({ filename: logFile, maxsize, maxFiles }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
});

// Очистка лога при старте
import fs from "fs";
if (fs.existsSync(logFile)) {
  fs.unlinkSync(logFile);
}
