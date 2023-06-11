import { NETWORK_NAME_TO_CHAIN_ID, NetworkName } from "types/lib/networks";
import { BlockListener } from "../services/BlockListener";
import { Config } from "../config";
import { ethers } from "ethers";
import { Logger } from "../interfaces";
import { Executor } from "executor/lib/executor";
import { AdvancedOpMempoolEntry } from "../entities/AdvancedOpMempoolEntry";
import { AdvancedOperationMempoolService } from "../services/AdvancedOpMempoolService";
import { ComparisionConditions, Conditions, IDbController } from "types/lib";


export class Eth {

    public blockListener: BlockListener;
    private logger: Logger;
    private executor: Executor;
    private advancedMempoolService: AdvancedOperationMempoolService;
    private db: IDbController
    constructor(config: Config, network: NetworkName, logger: Logger, executor: Executor, db: IDbController) {
        this.logger = logger;
        this.executor = executor;
        this.db = db;
        this.blockListener = new BlockListener(
            config.getWebsocketProvider(network)!
        );
        const chainId = Number(NETWORK_NAME_TO_CHAIN_ID[network]);

        this.advancedMempoolService = new AdvancedOperationMempoolService(
            this.db,
            chainId,
        );
        this.blockListener.listen(this.onBlockCallback);
    }
    public onBlockCallback = async (block: ethers.providers.Block) => {
        const timebasedContions: Array<Conditions> = [
            {
                key: "executionWindowStart",
                expectedValue: block.timestamp,
                comparisionConditions: ComparisionConditions.GT,

            },
            {
                key: "executionWindowEnd",
                expectedValue: block.timestamp,
                comparisionConditions: ComparisionConditions.LT,

            }
        ]

        // for time based transactions
        const advancedMempoolEntry: Array<AdvancedOpMempoolEntry> = await this.advancedMempoolService.fetchAllConditional(timebasedContions);
        console.log("advancedMempoolEntry", advancedMempoolEntry)
        if (advancedMempoolEntry.length > 0) {
            this.advancedTransactionToMempool(advancedMempoolEntry[0])
        }
        // advancedMempoolEntry.forEach(entry => this.advancedTransactionToMempool(entry));
    }

    private advancedTransactionToMempool = (advancedMempoolEntry: AdvancedOpMempoolEntry) => {
        let userOp = advancedMempoolEntry.userOp;
        userOp.advancedUserOperation = undefined;
        const entryPoint = advancedMempoolEntry.entryPoint;
        console.log('UserOperation:', userOp)
        this.executor.eth.sendUserOperation({ entryPoint, userOp: userOp })
    }

}