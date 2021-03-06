import { ProtocolConnectionInterface, ProtocolType } from "./websocket";

export interface IProtocolFactory {
  create(connection: ProtocolConnectionInterface): ProtocolType;
}

// Config
export const TConfig = Symbol("Config");
export const TContainer = Symbol("Container");

// Redis
export const TRedisClient = Symbol("RedisClient");
export const TRedisClientSub = Symbol("RedisClientSub");
export const TRedisClientTag = "Protocol";
export const TRedisClientTags = {
  Default: Symbol("Default"),
  Subscriber: Symbol("Subscriber")
};

// Websocket Server
export const TWebsocketServer = Symbol("WebsocketServer");
export const TWebsocketConnectionFactory = Symbol("WebsocketConnectionFactory");
// export const TWebsocketProtocolFactory = Symbol("WebsocketProtocolFactory");

// Protocols - these don't need to be in the DI? For testing maybe yes.
export const TProtocolFactory = Symbol("ProtocolFactory");
export const TProtocolFactoryTag = Symbol("TProtocolFactoryTag");
export const TProtocolHandshake = Symbol("ProtocolHandshake");
export const TProtocolV1 = Symbol("ProtocolV1");

export const TProtocolMessageEmitter = Symbol("ProtocolMessageEmitter");
export const TProtocolMessageReceiver = Symbol("ProtocolMessageReceiver");
export const TProtocolSubscriptionsEmitter = Symbol(
  "TProtocolSubscriptionsEmitter"
);

// Actions
export const TActionStore = Symbol("ActionStore");
export const TExecuteAction = Symbol("ExecuteAction");

// Publications, Queries
export const TPublicationStore = Symbol("PublicationStore");
export const TPublicationSubscribe = Symbol("QuerySubscribe");
export const TQueryUnsubscribe = Symbol("QueryUnsubscribe");
export const TQueryMetaService = Symbol("QueryMetaService");
export const TQueryTagsService = Symbol("QueryTagsService");
export const TQueryPublishService = Symbol("QueryPublishService");
export const TQueryExecuteService = Symbol("QueryExecuteService");

// Sessions
export const TIdentityMeta = Symbol("IdentityMeta");
export const TConnectionSubscriptions = Symbol("ConnectionSubscriptions");
export const TConnectionStore = Symbol("ConnectionStore");
export const TConnectionWrapperFactory = Symbol("ConnectionWrapperFactory");
export const TIdentityDataFactory = Symbol("SessionDataFactory");
export const TConnectionMessageReceiver = Symbol("ConnectionMessageReceiver");
export const TProtocolStore = Symbol("ProtocolStore");
