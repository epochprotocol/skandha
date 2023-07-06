import { Eth } from "../../../executor/lib/modules/eth";
import {
  EstimatedUserOperationGas,
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "types/lib/api/interfaces";
import { RpcMethodValidator } from "../utils/RpcMethodValidator";
import { SendUserOperationGasArgs } from "../dto/SendUserOperation.dto";
import { EstimateUserOperationGasArgs } from "../dto/EstimateUserOperation.dto";
import { AdvancedOpMempoolEntry } from "types/lib/common/AdvancedOpMempoolEntry";

export class EthAPI {
  constructor(private ethModule: Eth) { }

  /**
   *
   * @param userOp a full user-operation struct. All fields MUST be set as hex values. empty bytes block (e.g. empty initCode) MUST be set to "0x"
   * @param entryPoint the entrypoint address the request should be sent through. this MUST be one of the entry points returned by the supportedEntryPoints rpc call.
   */
  @RpcMethodValidator(SendUserOperationGasArgs)
  async sendUserOperation(args: SendUserOperationGasArgs): Promise<string> {
    return await this.ethModule.sendUserOperation(args);
  }

  /**
   * Estimate the gas values for a UserOperation. Given UserOperation optionally without gas limits and gas prices, return the needed gas limits.
   * The signature field is ignored by the wallet, so that the operation will not require user’s approval.
   * Still, it might require putting a “semi-valid” signature (e.g. a signature in the right length)
   * @param userOp same as eth_sendUserOperation gas limits (and prices) parameters are optional, but are used if specified
   * maxFeePerGas and maxPriorityFeePerGas default to zero
   * @param entryPoint Entry Point
   * @returns
   */
  @RpcMethodValidator(EstimateUserOperationGasArgs)
  async estimateUserOperationGas(
    args: EstimateUserOperationGasArgs
  ): Promise<EstimatedUserOperationGas> {
    return await this.ethModule.estimateUserOperationGas(args);
  }

  /**
   * Validates UserOp. If the UserOp (sender + entryPoint + nonce) match the existing UserOp in mempool,
   * validates if new UserOp can replace the old one (gas fees must be higher by at least 10%)
   * @param userOp same as eth_sendUserOperation
   * @param entryPoint Entry Point
   * @returns
   */
  @RpcMethodValidator(SendUserOperationGasArgs)
  async validateUserOp(args: SendUserOperationGasArgs): Promise<boolean> {
    return await this.ethModule.validateUserOp(args);
  }

  /**
   *
   * @param hash user op hash
   * @returns null in case the UserOperation is not yet included in a block, or a full UserOperation,
   * with the addition of entryPoint, blockNumber, blockHash and transactionHash
   */
  async getUserOperationByHash(
    hash: string
  ): Promise<UserOperationByHashResponse | null> {
    return await this.ethModule.getUserOperationByHash(hash);
  }

  /**
   *
   * @param sender senders address
   * @returns array of user operations that might get executed in future
   */
  async getUserOperations(
    sender: string
  ): Promise<Array<AdvancedOpMempoolEntry | null>> {
    return await this.ethModule.getUserOperations(sender);
  }

  /**
   *
   * @param hash user op hash
   * @returns a UserOperation receipt
   */
  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    return await this.ethModule.getUserOperationReceipt(hash);
  }

  /**
   * eth_chainId
   * @returns EIP-155 Chain ID.
   */
  async getChainId(): Promise<number> {
    return await this.ethModule.getChainId();
  }

  /**
   * Returns an array of the entryPoint addresses supported by the client
   * The first element of the array SHOULD be the entryPoint addresses preferred by the client.
   * @returns Entry points
   */
  async getSupportedEntryPoints(): Promise<string[]> {
    return await this.ethModule.getSupportedEntryPoints();
  }
}
