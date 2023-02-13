import { BundlingMode, UserOperationStruct } from 'packages/api/src/@types';
import { BundlerRPCMethods } from 'packages/api/src/bundler/constants';
import RpcError from 'packages/api/src/errors/rpc-error';
import * as RpcErrorCodes from '../error-codes';
import { RpcMethodValidator } from '../decorators';
import { IsEthereumAddress } from 'class-validator';
import { providers } from 'ethers';
import {
  BundlingService,
  MempoolService,
  ReputationService
} from '../services';

export class DumpReputationArgs {
  @IsEthereumAddress()
  public entryPoint!: string;
}

/*
  SPEC: https://eips.ethereum.org/EIPS/eip-4337#rpc-methods-debug-namespace
*/
export class Debug {
  public bundlingMode: BundlingMode = 'auto';

  constructor(
    private provider: providers.JsonRpcProvider,
    private bundlingService: BundlingService,
    private mempoolService: MempoolService,
    private reputationService: ReputationService,
  ) {}

  /**
   * Sets bundling mode.
   * After setting mode to “manual”, an explicit call to debug_bundler_sendBundleNow is required to send a bundle.
  */
  async setBundlingMode(mode: BundlingMode): Promise<string> {
    if (mode !== 'auto' && mode !== 'manual') {
      throw new RpcError(
        `Method ${BundlerRPCMethods.debug_bundler_setBundlingMode} is not supported`,
        RpcErrorCodes.INVALID_REQUEST
      );
    }
    this.bundlingMode = mode;
    return 'ok';
  }

  /** 
   * Clears the bundler mempool and reputation data of paymasters/accounts/factories/aggregators
   */
  async clearState(): Promise<string> {
    await this.mempoolService.clearState();
    await this.reputationService.clearState();
    return 'ok';
  }

  /**
   * Dumps the current UserOperations mempool
   * array - Array of UserOperations currently in the mempool
   */
  async dumpMempool(entryPoint: string): Promise<UserOperationStruct[]> {
    const entries = await this.mempoolService.dump();
    return entries.map(entry => entry.userOp);
  }

  /**
   * Forces the bundler to build and execute a bundle from the mempool as handleOps() transaction
   */
  async sendBundleNow(): Promise<string> {
    const bundle = await this.bundlingService.createBundle();
    await this.bundlingService.sendBundle(bundle);
    return 'ok';
  }

  /**
   * Sets reputation of given addresses. parameters:
   * An array of reputation entries to add/replace, with the fields:
   * reputations - An array of reputation entries to add/replace, with the fields:
   *        address - The address to set the reputation for.
   *        opsSeen - number of times a user operations with that entity was seen and added to the mempool
   *        opsIncluded - number of times a user operations that uses this entity was included on-chain
   *        status? - (string) The status of the address in the bundler ‘ok’
   * entryPoint the entrypoint used by eth_sendUserOperation
   */
  async setReputation(reputations: any[], entryPoint: string): Promise<string> {
    return 'ok';
  }

  /**
   * Returns the reputation data of all observed addresses.
   * Returns an array of reputation objects, each with the fields described above in debug_bundler_setReputation with the
   * entryPoint - The entrypoint used by eth_sendUserOperation
   */
  @RpcMethodValidator(DumpReputationArgs)
  async dumpReputation(args: DumpReputationArgs): Promise<[]> {
    return [];
  }
}
