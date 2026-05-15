import { EventEmitter } from "events";
import logger from "../config/logger.js";
import ProgramCreateEventHandler from "./handlers/programCreateEventHandler";
import SessionCreateEventHandler from "./handlers/SessionCreateEventHandler";
import SessionDeletedEventHandler from "./handlers/SessionDeletedEventHandler";
import SessionReorderEventHandler from "./handlers/SessionReorderEventHandler";
import TenantCreateEventHandler from "./handlers/TenantCreateEventHandler";
import BulkSessionCreatedEventHandler from "./handlers/BulkSessionCreatedEventHandler";
import PasswordResetEventHandler from "./handlers/PasswordResetEventHandler";
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
    this.on(EventTypes.PROGRAM_CREATED, ProgramCreateEventHandler);
    this.on(EventTypes.SESSION_CREATED, SessionCreateEventHandler);
    this.on(EventTypes.SESSION_DELETED, SessionDeletedEventHandler);
    this.on(EventTypes.SESSION_REORDERED, SessionReorderEventHandler);
    this.on(EventTypes.TENANT_CREATED, TenantCreateEventHandler);
    this.on(EventTypes.BULK_SESSION_CREATED, BulkSessionCreatedEventHandler);
    this.on(EventTypes.PASSWORD_RESETED, PasswordResetEventHandler);
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
