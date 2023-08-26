/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { AdvancedOperationMempoolService } from "common/lib/services";
import { BigNumber, providers } from "ethers";
import { IDbController, NETWORK_NAME_TO_CHAIN_ID, NetworkName } from "types/lib";
import { Config, NetworkConfig } from "./config";
import { Logger } from "./interfaces";
import { Debug, Eth, Web3 } from "./modules";
import {
  BundlingService,
  MempoolService,
  ReputationService,
  UserOpValidationService,
} from "./services";

export interface ExecutorOptions {
  network: NetworkName;
  db: IDbController;
  config: Config;
  logger: Logger;
}

export class Executor {
  private network: NetworkName;
  private networkConfig: NetworkConfig;
  private logger: Logger;

  public config: Config;
  public provider: providers.JsonRpcProvider;

  public web3: Web3;
  public debug: Debug;
  public eth: Eth;

  public bundlingService: BundlingService;
  public mempoolService: MempoolService;
  public advancedOpMempoolService: AdvancedOperationMempoolService;

  public userOpValidationService: UserOpValidationService;
  public reputationService: ReputationService;

  private db: IDbController;

  constructor(options: ExecutorOptions) {
    this.db = options.db;
    this.network = options.network;
    this.config = options.config;
    this.logger = options.logger;

    this.networkConfig = options.config.networks[
      options.network
    ] as NetworkConfig;

    this.provider = this.config.getNetworkProvider(
      this.network
    ) as providers.JsonRpcProvider;

    const chainId = Number(NETWORK_NAME_TO_CHAIN_ID[this.network]);
    this.reputationService = new ReputationService(
      this.db,
      chainId,
      this.networkConfig.minInclusionDenominator,
      this.networkConfig.throttlingSlack,
      this.networkConfig.banSlack,
      BigNumber.from(1),
      0
    );
    this.userOpValidationService = new UserOpValidationService(
      this.provider,
      this.reputationService,
      this.network,
      this.config
    );
    this.mempoolService = new MempoolService(
      this.db,
      chainId,
      this.reputationService
    );
    this.advancedOpMempoolService = new AdvancedOperationMempoolService(
      this.db,
      chainId,
    );
    this.bundlingService = new BundlingService(
      this.network,
      this.provider,
      this.mempoolService,
      this.userOpValidationService,
      this.reputationService,
      this.config,
      this.logger,
      this,
      this.db
    );
    this.web3 = new Web3(this.config);
    this.debug = new Debug(
      this.provider,
      this.bundlingService,
      this.mempoolService,
      this.reputationService
    );
    this.eth = new Eth(
      this.provider,
      this.userOpValidationService,
      this.mempoolService,
      this.advancedOpMempoolService,
      this.networkConfig,
      this.logger
    );
    this.logger.info('Creating executor');

  }
}
