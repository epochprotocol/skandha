import { NETWORK_NAME_TO_CHAIN_ID, NetworkName } from "types/lib/networks";
import { Config } from "../config";
import { ethers } from "ethers";
import { Logger } from "../interfaces";
import { Executor } from "executor/lib/executor";
import { ComparisionConditions, Conditions, IDbController } from "types/lib";
import { BlockListener } from "../services/blockListener";
import { AdvancedOpMempoolEntry } from "types/lib/common/AdvancedOpMempoolEntry";
import { AdvancedOperationMempoolService } from "common/lib/services";


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
    public onBlockCallback = async (block: ethers.providers.Block, events: ethers.providers.Log[]) => {
        console.log("block.timestamp: ", block.timestamp);
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
        this.logger.info("advancedMempoolEntry", advancedMempoolEntry)

        // for event based transactions
        // const advancedMempoolEntryMatchedEvent: Array<AdvancedOpMempoolEntry> = await this.advancedMempoolService.fetchAllEventConditionals(events);
        // this.logger.info("advancedMempoolEntryMatchedEvent: ", advancedMempoolEntryMatchedEvent);

        await Promise.all(advancedMempoolEntry.map(async (element) => {
            await this.advancedMempoolService.remove(element);
            this.advancedTransactionToMempool(element)
        }))

        // await Promise.all(advancedMempoolEntryMatchedEvent.map(async (element) => {
        //     await this.advancedMempoolService.remove(element);
        //     this.advancedTransactionToMempool(element)
        // }))
    }

    private advancedTransactionToMempool = (advancedMempoolEntry: AdvancedOpMempoolEntry) => {
        let userOp = advancedMempoolEntry.userOp;
        userOp.advancedUserOperation = undefined;
        const entryPoint = advancedMempoolEntry.entryPoint;
        console.log('UserOperation:', userOp)
        this.executor.eth.sendUserOperation({ entryPoint, userOp: userOp })
    }

}