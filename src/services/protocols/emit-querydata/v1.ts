import * as ejson from "ejson";
import { inject, tagged, injectable, named } from "inversify";
import { Protocols, QueryId, Message } from "doso-protocol";

// Types
import { TProtocolMessageEmitter } from "../../../types/di";
import {
  IProtocolSubscriptionsEmitter,
  IProtocolMessageEmitter
} from "../../../types/protocols";

// Modules
import { ConnectionWrapper } from "../../connection/wrapper";

@injectable()
export class ProtocolsSubscriptionsEmitterV1
  implements IProtocolSubscriptionsEmitter {
  @inject(TProtocolMessageEmitter)
  @named(Protocols.V1.ID)
  private messageEmitter!: IProtocolMessageEmitter;

  /**
   * Chunk `data` into an array of Message[].
   * @param queryId
   * @param data
   */
  private chunkData(queryId: QueryId, data: any): Message[] {
    const dataEJson = ejson.stringify(data);
    const chunkSize = 100; // TODO: from config?
    const chunksCount = Math.ceil(dataEJson.length / chunkSize);
    const messages: Message[] = [];
    for (let i = 0; i < chunksCount; i++) {
      const payload: Protocols.V1.Server.SubscriptionDataPayload = {
        id: queryId,
        total: chunksCount,
        part: 0,
        stream: ""
      };
      const message = Protocols.V1.Server.messageFactory(
        Protocols.V1.Server.Tokens.SubscriptionData,
        payload
      );
      message.payload.part = i + 1;
      message.payload.stream = dataEJson.substr(i * chunkSize, chunkSize);
      messages.push(message);
    }
    return messages;
  }

  /**
   * Emit `messages` to `connection`.
   */
  private async sendDataToConnection(
    connection: ConnectionWrapper,
    messages: Message[]
  ) {
    messages.forEach(message =>
      this.messageEmitter.emitMessage(connection, message)
    );
  }

  /**
   * Emit `data` of `queryId` to `connections`.
   */
  async emitDataToConnectionIds(
    connections: ConnectionWrapper[],
    queryId: QueryId,
    data: any
  ): Promise<any> {
    // Chunk the data up into slices in Message objects
    const messages = this.chunkData(queryId, data);

    // Build an array of Promises to emit `messages` to all `connections`.
    const promises: Promise<void>[] = [];
    connections.map(connection => {
      const promise = this.sendDataToConnection.bind(connection, messages);
      promises.push(promise);
    });

    // Aggregate all `promises` as one and return it
    return Promise.all(promises);
  }
}
