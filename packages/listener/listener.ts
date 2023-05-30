/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { BigNumber, providers } from "ethers";
import { NETWORK_NAME_TO_CHAIN_ID, NetworkName } from "types/lib";
import { IDbController } from "types/lib";
import { NetworkConfig } from "./config";

import { Config } from "./config";
import { Logger } from "./interfaces";
import { AdvancedOperationMempoolService } from "./src/services/AdvancedOpMempoolService";
import { MempoolService } from "./src/services/MempoolService";
import { Eth } from "./src/modules/eth";

export interface ListenerOptions {
    network: NetworkName;
    db: IDbController;
    config: Config;
    logger: Logger;
}

export class Listener {
    private network: NetworkName;
    private eth: Eth;

    public config: Config;
    public provider: providers.JsonRpcProvider;


    public mempoolService: MempoolService;
    public advancedOpMempoolService: AdvancedOperationMempoolService;


    private db: IDbController;
    logger: Logger;
    networkConfig: NetworkConfig;

    constructor(options: ListenerOptions) {
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

        this.mempoolService = new MempoolService(
            this.db,
            chainId,
        );
        this.advancedOpMempoolService = new AdvancedOperationMempoolService(
            this.db,
            chainId,
        );

        this.eth = new Eth(this.config, this.network);


    }
}
