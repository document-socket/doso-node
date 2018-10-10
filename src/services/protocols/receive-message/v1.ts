import { injectable, inject, named } from "inversify";
import { Message, Protocols } from "doso-protocol";

// Types
import {
  TPublicationSubscribe,
  TQueryUnsubscribe,
  TExecuteAction,
  TIdentityMeta,
  TProtocolMessageEmitter
} from "../../../types/di";
import {
  IProtocolMessageReceiver,
  IProtocolMessageEmitter
} from "../../../types/protocols";

type RequestMethod = (
  connection: ConnectionWrapper,
  request: Message
) => Promise<any>;

// Modules
import PublicationSubscribeService from "../../publication/subscribe";
import QueryUnsubscribeService from "../../subscription/unsubscribe";
import { ConnectionWrapper } from "../../connection/wrapper";
import ActionExecuteService from "../../action/execute";
import IdentityMetaService from "../../identity/meta";

@injectable()
export class ProtocolReceiverV1 implements IProtocolMessageReceiver {
  /**
   * Inject dependencies.
   */
  @inject(TIdentityMeta)
  private identityMetaService!: IdentityMetaService;
  @inject(TPublicationSubscribe)
  private publicationSubscribeService!: PublicationSubscribeService;
  @inject(TQueryUnsubscribe)
  private queryUnsubscribeService!: QueryUnsubscribeService;
  @inject(TExecuteAction)
  private executeActionService!: ActionExecuteService;
  @inject(TProtocolMessageEmitter)
  @named(Protocols.V1.ID)
  private messageEmitter!: IProtocolMessageEmitter;

  /**
   * Create a new session and send back a ConnectResponse about it.
   */
  private async createNewIdentity(
    connection: ConnectionWrapper,
    request: Protocols.V1.Client.IdentityCreateRequest
  ) {
    const newIdentity = await this.identityMetaService.createNewIdentity();
    const payload: Protocols.V1.Server.IdentityCreatePayload = {
      version: Protocols.V1.ID,
      session: newIdentity.id,
      secret: newIdentity.secret
    };
    const response = Protocols.V1.Server.messageFactory(
      Protocols.V1.Server.Tokens.IdentityCreate,
      payload,
      request.requestId
    );
    this.messageEmitter.emitMessage(connection, response);
  }

  /**
   * Try and re-use the session specified in `request`.
   * If successful, send back a ConnectionResponse with the details and return
   * true. Otherwise return false.
   */
  private async reuseIdentity(
    connection: ConnectionWrapper,
    request: Protocols.V1.Client.IdentityValidateRequest
  ): Promise<boolean> {
    if (!request.payload.identity) {
      return false;
    }

    // Try to reuse the session...
    const { identity, signature = "", timestamp = 0 } = request.payload;
    const success = await this.identityMetaService.authenticate(
      identity,
      signature,
      timestamp
    );
    if (!success) {
      return false;
    }

    // The above will raise an Error if session is invalid
    const payload: Protocols.V1.Server.IdentityValidatePayload = {
      identity
    };
    this.messageEmitter.emitError(connection, payload, request.requestId);

    return true;
  }

  /**
   * `connection` requests to subscribe to a publication defined in
   * `message`.
   */
  private async subscribeRequest(
    connection: ConnectionWrapper,
    message: Protocols.V1.Client.SubscribeRequest
  ) {
    const queryId = await this.publicationSubscribeService.subscribe(
      connection,
      message.payload.name,
      message.payload.params
    );
    const payload: Protocols.V1.Server.SubscribePayload = {
      id: queryId
    };
    const response = Protocols.V1.Server.messageFactory(
      Protocols.V1.Server.Tokens.Subscribe,
      payload,
      message.requestId ? message.requestId : 0
    );
    return response;
  }

  /**
   * `connection` requests to unsubscribe the query identified by
   * `message.payload.id`.
   */
  private async unsubscribeRequest(
    connection: ConnectionWrapper,
    message: Protocols.V1.Client.UnsubscribeRequest
  ) {
    await this.queryUnsubscribeService.unsubscribe(
      connection.getConnectionId(),
      message.payload.id
    );

    const payload: Protocols.V1.Server.UnsubscribePayload = {
      handle: message.payload.id
    };
    const response = Protocols.V1.Server.messageFactory(
      Protocols.V1.Server.Tokens.Unsubscribe,
      payload,
      message.requestId ? message.requestId : 0
    );

    return response;
  }

  private async execRequest(
    connection: ConnectionWrapper,
    request: Protocols.V1.Client.ExecRequest
  ) {
    console.log("// exec", request.payload.name, request.payload.params);
    //////////////////////////////
    const session = connection.getIdentityData();
    // if (!session) {
    //   throw new Error("No session");
    // }

    // Exec
    const result = await this.executeActionService.execute(
      request.payload.name,
      request.payload.params,
      session
    );

    // Send back the results
    const response = Protocols.V1.Server.messageFactory(
      Protocols.V1.Server.Tokens.Exec,
      result.payload,
      request.requestId ? request.requestId : 0
    );
    this.messageEmitter.emitMessage(connection, response);
  }

  /**
   * Return the request map for `connection`.
   */
  private getOpmapForConnection(
    connection: ConnectionWrapper
  ): { [key: string]: RequestMethod } {
    if (connection.getIdentityId()) {
      return {
        [Protocols.V1.Client.Tokens.IdentityCreate]: this.createNewIdentity,
        [Protocols.V1.Client.Tokens.IdentityValidate]: this.reuseIdentity
      };
    }

    return {
      [Protocols.V1.Client.Tokens.Subscribe]: this.subscribeRequest,
      [Protocols.V1.Client.Tokens.Unsubscribe]: this.unsubscribeRequest,
      [Protocols.V1.Client.Tokens.Exec]: this.execRequest
    };
  }

  async receiveMessage(
    connection: ConnectionWrapper,
    request: Message
  ): Promise<any> {
    const requestHandlers = this.getOpmapForConnection(connection);
    const fnRequestHandler = requestHandlers[request.type];
    if (fnRequestHandler === undefined) {
      // Unknown request.
      const payload: Protocols.V1.Server.ErrorPayload = {
        error: 1
      };
      return this.messageEmitter.emitError(
        connection,
        payload,
        request.requestId
      );
    }

    return fnRequestHandler(connection, request);
  }
}
