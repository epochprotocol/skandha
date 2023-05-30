// TODO: create a new package "config" instead of this file
import { NetworkName } from "types/lib";
import { BigNumberish, Wallet, providers, utils } from "ethers";

export interface NetworkConfig {

    rpcEndpoint: string;
    webSocketEndpoint: string;

}


export type Networks = {
    [network in NetworkName]?: NetworkConfig;
};

export interface ConfigOptions {
    networks: Networks;
    testingMode?: boolean;
    unsafeMode: boolean;
}

export class Config {
    networks: Networks;
    testingMode: boolean;
    unsafeMode: boolean;

    constructor(private config: ConfigOptions) {
        this.testingMode = config.testingMode ?? false;
        this.unsafeMode = config.unsafeMode ?? false;
        this.networks = config.networks;
    }


    getNetworkProvider(network: NetworkName): providers.JsonRpcProvider | null {
        const conf = this.networks[network];
        let endpoint = RPC_ENDPOINT_ENV(network);
        if (!endpoint) {
            endpoint = conf?.rpcEndpoint;
        }
        return endpoint ? new providers.JsonRpcProvider(endpoint) : null;
    }
    getWebsocketProvider(network: NetworkName): providers.WebSocketProvider | null {
        const conf = this.networks[network];
        let endpoint = WEBSOCKET_ENDPOINT_ENV(network);
        if (!endpoint) {
            endpoint = conf?.rpcEndpoint;
        }
        return endpoint ? new providers.WebSocketProvider(endpoint) : null;
    }

}


const RPC_ENDPOINT_ENV = (network: NetworkName): string | undefined =>
    process.env[`SKANDHA_${network.toUpperCase()}_RPC`];

const WEBSOCKET_ENDPOINT_ENV = (network: NetworkName): string | undefined =>
    process.env[`SKANDHA_${network.toUpperCase()}_WEBSOCKET`];
