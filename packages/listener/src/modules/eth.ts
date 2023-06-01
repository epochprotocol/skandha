import { NetworkName } from "types/lib/networks";
import { BlockListener } from "../services/BlockListener";
import { Config } from "../config";
import { ethers } from "ethers";
import { Logger } from "../interfaces";
import { AdvancedUserOperation, CustomUserOperationStruct } from "types/src/executor/common";
import { Executor } from "executor/lib/executor";
import { AdvancedOpMempoolEntry } from "../entities/AdvancedOpMempoolEntry";


export class Eth {

    public blockListener: BlockListener;
    private logger: Logger;
    private executor: Executor;
    constructor(config: Config, network: NetworkName, logger: Logger, executor: Executor) {
        this.logger = logger;
        this.executor = executor;
        this.blockListener = new BlockListener(
            config.getWebsocketProvider(network)!
        );
        this.blockListener.listen(this.onBlockCallback);
    }
    public onBlockCallback = (block: ethers.providers.Block) => {
        console.log("Get something done here");

    }

    private advancedTransactionToMempool = (advancedMempoolEntry: AdvancedOpMempoolEntry) => {
        const userOp = advancedMempoolEntry.userOp;
        userOp.advancedUserOperation = undefined;
        const entryPoint = advancedMempoolEntry.entryPoint;
        this.executor.eth.sendUserOperation({ entryPoint, userOp: userOp })
    }

}