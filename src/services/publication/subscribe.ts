import { injectable, inject } from "inversify";
const sha1 = require("sha1");

// Types
import { Publication } from "../../types/publication";
import { QueryParams, QueryId } from "doso-protocol";
import { IdentityDataAccessor } from "../../types/identity";

// Services
import ConnectionSubscriptionsService from "../connection/subscriptions";
import PublicationStoreService from "./store";
import QueryMetaService from "../subscription/meta";
import { PublicationName } from "doso-protocol";
import {
  TPublicationStore,
  TQueryMetaService,
  TConnectionSubscriptions
} from "../../types/di";
import { ConnectionWrapper } from "../connection/wrapper";

/**
 * Singleton Service to let WebsocketConnections watching Publications.
 */
@injectable()
export default class PublicationSubscribeService {
  @inject(TConnectionSubscriptions)
  private connectionSubscriptionsService!: ConnectionSubscriptionsService;
  @inject(TPublicationStore)
  private publicationStoreService!: PublicationStoreService;
  @inject(TQueryMetaService)
  private queryMetaService!: QueryMetaService;

  /**
   * Determines whether `identityData` is allowed to use `publication`
   * with `params`. Throws an Error if it's not allowed.
   */
  private async authorize(
    publication: Publication,
    params: QueryParams,
    identityData: IdentityDataAccessor
  ): Promise<void> {
    if (!publication.authorize) {
      return;
    }
    const authorized = await publication.authorize(params, identityData);
    if (!authorized) {
      throw new Error("Unauthorized");
    }
  }

  /**
   * Calculate the QueryId for the input params.
   */
  private calculateQueryId(
    publication: Publication,
    params: QueryParams,
    identityData: IdentityDataAccessor
  ): QueryId {
    let hashBase = JSON.stringify(params);
    if (this.publicationStoreService.isPrivatePublication(publication)) {
      hashBase = hashBase + "\n" + identityData.getIdentityId();
    }
    return sha1(hashBase);
  }

  /**
   * Create Query based on arguments and return its QueryId.
   */
  private async getQuery(
    publication: Publication,
    params: QueryParams,
    identityData: IdentityDataAccessor
  ): Promise<QueryId> {
    const queryId = this.calculateQueryId(publication, params, identityData);
    await this.connectionSubscriptionsService.bind(
      identityData.getIdentityId(),
      queryId
    );
    const exists = await this.queryMetaService.exists(queryId);
    if (!exists) {
      await this.queryMetaService.create(queryId, publication.name, params);
    }
    return queryId;
  }

  /**
   * Subscribe `connection` to Publication with `name` using `params`.
   */
  async subscribe(
    connection: ConnectionWrapper,
    publicationName: PublicationName,
    params?: QueryParams
  ): Promise<QueryId> {
    const publication = this.publicationStoreService.findPublication(
      publicationName
    );

    // Try and authorize the `identityData` first for the request.
    const queryParams = params || {};
    const identityData = connection.getIdentityData();
    await this.authorize(publication, queryParams, identityData);

    // Then look or create the Query
    const queryId = await this.getQuery(publication, queryParams, identityData);

    this.connectionSubscriptionsService.bind(
      connection.getConnectionId(),
      queryId
    );

    // TODO: schedule Query to execute

    return queryId;
  }
}
