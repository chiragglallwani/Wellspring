import { jest, describe, it, expect } from "@jest/globals";
import logger from "../logger.js";

describe("Logger Configuration", () => {
  it("should have correct log level", () => {
    expect(logger.level).toBe(process.env.LOG_LEVEL || "info");
  });

  it("should have json format", () => {
    const logMessage = "test message";
    const spy = jest.spyOn(logger, "info");

    logger.info(logMessage);

    expect(spy).toHaveBeenCalledWith({ message: logMessage });
    spy.mockRestore();
  });
});
