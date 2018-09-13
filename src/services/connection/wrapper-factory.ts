import { inject, injectable, targetName, named } from "inversify";

// Types
import { TIdentityDataFactory, TProtocolMessageReceiver } from "../../types/di";
import { Connection } from "sockjs";

// Modules
import { IdentityDataFactoryService } from "../identity/data-factory";
import { ProtocolReceiveMessageService } from "../protocols/receive-message";
import { ConnectionWrapper } from "./wrapper";

@injectable()
export class ConnectionWrapperFactoryService {
  /**
   * Inject Dependencies.
   */
  @inject(TProtocolMessageReceiver)
  @named("root")
  private messageReceiver!: ProtocolReceiveMessageService;

  @inject(TIdentityDataFactory)
  identityDataFactory!: IdentityDataFactoryService;

  create(connection: Connection) {
    return new ConnectionWrapper(
      connection,
      this.messageReceiver,
      this.identityDataFactory
    );
  }
}
