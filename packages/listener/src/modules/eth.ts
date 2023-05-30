import { NetworkName } from "types/lib/networks";
import { BlockListener } from "../services/BlockListener";
import { IDbController } from "types/lib/db";
import { Config } from "../../config";
import { Logger } from "ethers/lib/utils";
import { ethers } from "ethers";


export class Eth {

    public blockListener: BlockListener;
    constructor(config: Config, network: NetworkName) {
        this.blockListener = new BlockListener(config.getWebsocketProvider(network)!);
        this.blockListener.listen(this.onBlockCallback);
    }
    public onBlockCallback = (block: ethers.providers.Block) => {
        console.log(block);
    }

}