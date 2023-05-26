import { ethers } from "ethers";

export class BlockListner {
    wssProvider: ethers.providers.WebSocketProvider;

    constructor() {
        this.wssProvider = new ethers.providers.WebSocketProvider(
            `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`
        );
    }

    listen = () => {
        this.wssProvider.on("block", this.onBlock.bind(this));
    }
    onBlock = async (blockNumber: number) => {
        const block = await this.wssProvider.getBlock(blockNumber);

        console.log(block.number.toString());
    }

}