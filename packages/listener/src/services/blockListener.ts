import { ethers } from "ethers";
type OnBlockCallback = (block: ethers.providers.Block) => void;
export class BlockListener {
    wssProvider: ethers.providers.WebSocketProvider;

    constructor(provider: ethers.providers.WebSocketProvider) {
        this.wssProvider = provider;
    }

    listen = (onBlockCallBack: OnBlockCallback) => {
        console.log("onBlockCallBack", onBlockCallBack);
        this.wssProvider.on("block", (blockNumber: number) => {
            this.onBlock(blockNumber, onBlockCallBack)
        });
    }
    onBlock = async (blockNumber: number, onBlockCallBack: OnBlockCallback) => {

        const block: ethers.providers.Block = await this.wssProvider.getBlock(blockNumber);
        console.log("block number: ", block.number.toString());
        onBlockCallBack(block);
    }

}