import { Message, QueryId } from "doso-protocol";

// Modules
import { ConnectionWrapper } from "../services/connection/wrapper";

export interface IProtocolMessageReceiver {
  receiveMessage(connection: ConnectionWrapper, message: Message): Promise<any>;
}

export interface IProtocolSubscriptionsEmitter {
  emitDataToConnectionIds(
    connections: ConnectionWrapper[],
    queryId: QueryId,
    data: any
  ): Promise<any>;
}

export interface IProtocolMessageEmitter {
  emitMessage(connection: ConnectionWrapper, message: Message): void;
  emitError(
    connection: ConnectionWrapper,
    payload: any,
    requestId?: number
  ): void;
}
