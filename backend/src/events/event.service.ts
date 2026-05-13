import { EventEmitter } from "events";
import logger from "../config/logger.js";
import programCreateEventHandler from "./handlers/programCreateEventHandler.js";
import { EventTypes } from "./types/EventTypes.js";

class EventService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  publishEvent(eventName: string, data: Record<string, any>) {
    setImmediate(() => {
      this.emit(eventName, data);
    });
  }

  registerHandlers = () => {
    // todo: publish events to the event service such as audit logs, etc.
    this.on(EventTypes.PROGRAM_CREATED, programCreateEventHandler);
  };

  emitEventHelper = (eventName: string, data: Record<string, any>) => {
    try {
      this.publishEvent(eventName, data);
    } catch (error) {
      logger.error(`Error publishing event ${eventName}: ${error}`);
    }
  };
}

export default new EventService();
