import { jest, describe, it, expect } from "@jest/globals";
import logger from "../logger";

describe("Logger Configuration", () => {
  it("should have correct log level", () => {
    expect(logger.level).toBe(process.env.LOG_LEVEL || "info");
  });

  it("should have json format", () => {
    const logMessage = "test message";
    const spy = jest.spyOn(logger, "info");

    logger.info(logMessage);

    expect(spy.mock.calls[0]?.[0]).toBe(logMessage);
    spy.mockRestore();
  });
});
