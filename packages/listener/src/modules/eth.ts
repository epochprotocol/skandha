import { NetworkName } from "types/lib/networks";
import { BlockListener } from "../services/BlockListener";
import { Config } from "../config";
import { ethers } from "ethers";
import { Logger } from "../interfaces";


export class Eth {

    public blockListener: BlockListener;
    private logger: Logger;
    constructor(config: Config, network: NetworkName, logger: Logger) {
        this.logger = logger;
        this.blockListener = new BlockListener(
            config.getWebsocketProvider(network)!
        );
        this.blockListener.listen(this.onBlockCallback);
    }
    public onBlockCallback = (block: ethers.providers.Block) => {
        console.log("Get something done here");
    }

}