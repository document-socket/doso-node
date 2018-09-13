import { Container } from "inversify";

import Config from "./config";
import ActionStoreService from "./services/action/store";
import PublicationStoreService from "./services/publication/store";
import PublicationSubscribeService from "./services/publication/subscribe";
import ActionExecuteService from "./services/action/execute";
import { WebsocketServer } from "./services/sockjs-server";

import * as Services from "./types/di";
import { ConfigType } from "./types/config";
import { RedisClientFactory } from "./services/redis-client";
import ConnectionSubscriptionsService from "./services/connection/subscriptions";
import {
  IProtocolMessageReceiver,
  IProtocolMessageEmitter,
  IProtocolSubscriptionsEmitter
} from "./types/protocols";
import { Protocols } from "doso-protocol";
import { ProtocolsEmitMessageV1 } from "./services/protocols/emit-message/v1";
import { ProtocolsEmitMessageHandshake } from "./services/protocols/emit-message/handshake";
import { IPromiseRedisClient } from "./types/redis";
import { ProtocolReceiveHandshake } from "./services/protocols/receive-message/handshake";
import { ProtocolReceiverV1 } from "./services/protocols/receive-message/v1";
import { ProtocolReceiveMessageService } from "./services/protocols/receive-message";
import { ConnectionStoreService } from "./services/connection/store";
import { ConnectionWrapperFactoryService } from "./services/connection/wrapper-factory";
import { IdentityDataFactoryService } from "./services/identity/data-factory";
import IdentityMetaService from "./services/identity/meta";
import QueryMetaService from "./services/subscription/meta";
import QueryUnsubscribeService from "./services/subscription/unsubscribe";
import QueryTagsService from "./services/subscription/tags";
import QueryPublishService from "./services/subscription/publish";
import QueryExecuteService from "./services/subscription/execute";
import { ProtocolsSubscriptionsEmitterV1 } from "./services/protocols/emit-querydata/v1";
import { ProtocolsSubscriptionsEmitterService } from "./services/protocols/emit-querydata";

/**
 * Inversion Of Control class container
 */
export class Kernel extends Container {
  constructor(config: ConfigType) {
    super();

    // Configuration
    const configInstance = new Config();
    configInstance.init(config);
    this.bind<Config>(Services.TConfig).toConstantValue(configInstance);

    this.bind<Container>(Services.TContainer).toConstantValue(this);

    // Utils
    [Services.TRedisClient, Services.TRedisClientSub].forEach(diType => {
      const redisClient = RedisClientFactory(
        configInstance
      ) as IPromiseRedisClient;
      this.bind<IPromiseRedisClient>(diType).toConstantValue(redisClient);
    });

    // Publications
    this.bind<PublicationStoreService>(Services.TPublicationStore)
      .to(PublicationStoreService)
      .inSingletonScope();
    this.bind<PublicationSubscribeService>(Services.TPublicationSubscribe)
      .to(PublicationSubscribeService)
      .inSingletonScope();
    this.bind<QueryMetaService>(Services.TQueryMetaService)
      .to(QueryMetaService)
      .inSingletonScope();
    this.bind<QueryUnsubscribeService>(Services.TQueryUnsubscribe)
      .to(QueryUnsubscribeService)
      .inSingletonScope();
    this.bind<QueryTagsService>(Services.TQueryTagsService)
      .to(QueryTagsService)
      .inSingletonScope();
    this.bind<QueryPublishService>(Services.TQueryPublishService)
      .to(QueryPublishService)
      .inSingletonScope();
    this.bind<QueryExecuteService>(Services.TQueryExecuteService)
      .to(QueryExecuteService)
      .inSingletonScope();

    // Actions
    this.bind<ActionStoreService>(Services.TActionStore)
      .to(ActionStoreService)
      .inSingletonScope();
    this.bind<ActionExecuteService>(Services.TExecuteAction)
      .to(ActionExecuteService)
      .inSingletonScope();

    // Connections
    this.bind<ConnectionWrapperFactoryService>(
      Services.TConnectionWrapperFactory
    )
      .to(ConnectionWrapperFactoryService)
      .inSingletonScope();
    this.bind<ConnectionStoreService>(Services.TConnectionStore)
      .to(ConnectionStoreService)
      .inSingletonScope();
    this.bind<ConnectionSubscriptionsService>(Services.TConnectionSubscriptions)
      .to(ConnectionSubscriptionsService)
      .inSingletonScope();

    this.bind<IdentityMetaService>(Services.TIdentityMeta)
      .to(IdentityMetaService)
      .inSingletonScope();

    this.bind<IdentityDataFactoryService>(Services.TIdentityDataFactory)
      .to(IdentityDataFactoryService)
      .inSingletonScope();

    // Protocols - Message Emitters
    this.bind<IProtocolMessageEmitter>(Services.TProtocolMessageEmitter)
      .to(ProtocolsEmitMessageHandshake)
      .inSingletonScope()
      .whenTargetNamed(Protocols.Handshake.ID);
    this.bind<IProtocolMessageEmitter>(Services.TProtocolMessageEmitter)
      .to(ProtocolsEmitMessageV1)
      .inSingletonScope()
      .whenTargetNamed(Protocols.V1.ID);

    // Protocols - Subscription Emitters
    this.bind<IProtocolSubscriptionsEmitter>(
      Services.TProtocolSubscriptionsEmitter
    )
      .to(ProtocolsSubscriptionsEmitterV1)
      .inSingletonScope()
      .whenTargetNamed(Protocols.V1.ID);
    this.bind<ProtocolsSubscriptionsEmitterService>(
      Services.TProtocolSubscriptionsEmitter
    )
      .to(ProtocolsSubscriptionsEmitterService)
      .inSingletonScope()
      .whenTargetNamed("root");

    // Protocols - Message Receivers
    this.bind<IProtocolMessageReceiver>(Services.TProtocolMessageReceiver)
      .to(ProtocolReceiveHandshake)
      .inSingletonScope()
      .whenTargetNamed(Protocols.Handshake.ID);
    this.bind<IProtocolMessageReceiver>(Services.TProtocolMessageReceiver)
      .to(ProtocolReceiverV1)
      .inSingletonScope()
      .whenTargetNamed(Protocols.V1.ID);
    this.bind<IProtocolMessageReceiver>(Services.TProtocolMessageReceiver)
      .to(ProtocolReceiveMessageService)
      .inSingletonScope()
      .whenTargetNamed("root");

    // Server
    this.bind<WebsocketServer>(Services.TWebsocketServer).to(WebsocketServer);

    // Wire up
    const receiveMessageServiceRoot: ProtocolReceiveMessageService = this.getNamed(
      Services.TProtocolMessageReceiver,
      "root"
    );
    receiveMessageServiceRoot.init();
  }
}
