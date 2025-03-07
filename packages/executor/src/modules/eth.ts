import { BigNumber, ethers } from "ethers";
import { arrayify, hexlify } from "ethers/lib/utils";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import {
  EntryPoint,
  UserOperationEventEvent,
  UserOperationStruct,
} from "types/lib/executor/contracts/EntryPoint";
import {
  EstimatedUserOperationGas,
  UserOperationByHashResponse,
  UserOperationReceipt,
} from "types/lib/api/interfaces";
import { EntryPoint__factory } from "types/lib/executor/contracts/factories";
import { NetworkConfig } from "../config";
import { deepHexlify, packUserOp } from "../utils";
import { UserOpValidationService, MempoolService } from "../services";
import { Logger, Log } from "../interfaces";
import {
  EstimateUserOperationGasArgs,
  SendUserOperationGasArgs,
} from "./interfaces";
import { CustomUserOperationStruct } from "types/src/executor/common";
import { ComparisionConditions, Conditions } from "types/lib";
import { AdvancedOperationMempoolService } from "common/lib/services";
import { AdvancedOpMempoolEntry } from "types/lib/common/AdvancedOpMempoolEntry";

export class Eth {
  constructor(
    private provider: ethers.providers.JsonRpcProvider,
    private userOpValidationService: UserOpValidationService,
    private mempoolService: MempoolService,
    private advancedMempoolService: AdvancedOperationMempoolService,
    private config: NetworkConfig,
    private logger: Logger
  ) { }

  /**
   *
   * @param userOp a full user-operation struct. All fields MUST be set as hex values. empty bytes block (e.g. empty initCode) MUST be set to "0x"
   * @param entryPoint the entrypoint address the request should be sent through. this MUST be one of the entry points returned by the supportedEntryPoints rpc call.
   */
  async sendUserOperation(args: SendUserOperationGasArgs): Promise<string> {
    let userOp = args.userOp as unknown as CustomUserOperationStruct;
    const entryPoint = args.entryPoint;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }
    this.logger.debug("Validating user op before sending to mempool...");


    this.logger.debug("Validation successful. Saving in mempool...");
    console.log("userOp.advancedUserOperation: ", userOp.advancedUserOperation);
    if (userOp.advancedUserOperation) {
      await this.advancedMempoolService.addAdvancedUserOp(
        userOp,
        entryPoint,
      );
    } else {
      console.log("userOp.advancedUserOperation:ADSFADSF ", userOp);
      const validationResult =
        await this.userOpValidationService.simulateValidation(userOp, entryPoint);
      await this.mempoolService.addUserOp(
        userOp,
        entryPoint,
        validationResult.returnInfo.prefund,
        validationResult.senderInfo,
        validationResult.referencedContracts?.hash
      );

    }
    this.logger.debug("Saved in mempool");
    const entryPointContract = EntryPoint__factory.connect(
      entryPoint,
      this.provider
    );
    const opHash = await entryPointContract.getUserOpHash(userOp);
    console.log("OpHash: " + opHash);
    return opHash;
    // TODO: fetch aggregator


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
  async estimateUserOperationGas(
    args: EstimateUserOperationGasArgs
  ): Promise<EstimatedUserOperationGas> {
    const { userOp, entryPoint } = args;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }
    const userOpComplemented: UserOperationStruct = {
      ...userOp,
      paymasterAndData: "0x",
      maxFeePerGas: 0,
      maxPriorityFeePerGas: 0,
      preVerificationGas: 0,
      verificationGasLimit: 10e6,
    };
    const preVerificationGas = this.calcPreVerificationGas(userOp);
    userOpComplemented.preVerificationGas = preVerificationGas;

    const { returnInfo } =
      await this.userOpValidationService.validateForEstimation(
        userOpComplemented,
        entryPoint
      );

    // eslint-disable-next-line prefer-const
    let { preOpGas, validAfter, validUntil } = returnInfo;

    const callGasLimit = await this.provider
      .estimateGas({
        from: entryPoint,
        to: userOp.sender,
        data: userOp.callData,
      })
      .then((b) => b.toNumber())
      .catch((err) => {
        const message =
          err.message.match(/reason="(.*?)"/)?.at(1) ?? "execution reverted";
        throw new RpcError(message, RpcErrorCodes.EXECUTION_REVERTED);
      });
    // const preVerificationGas = this.calcPreVerificationGas(userOp);
    const verificationGas = BigNumber.from(preOpGas).toNumber();
    validAfter = BigNumber.from(validAfter);
    validUntil = BigNumber.from(validUntil);
    if (validUntil === BigNumber.from(0)) {
      validUntil = undefined;
    }
    if (validAfter === BigNumber.from(0)) {
      validAfter = undefined;
    }
    return {
      preVerificationGas,
      verificationGas,
      callGasLimit,
      validAfter,
      validUntil,
      // validAfter,
      // validUntil,

    };
  }

  /**
   * Validates UserOp. If the UserOp (sender + entryPoint + nonce) match the existing UserOp in mempool,
   * validates if new UserOp can replace the old one (gas fees must be higher by at least 10%)
   * @param userOp same as eth_sendUserOperation
   * @param entryPoint Entry Point
   * @returns
   */
  async validateUserOp(args: SendUserOperationGasArgs): Promise<boolean> {
    const { userOp, entryPoint } = args;
    if (!this.validateEntryPoint(entryPoint)) {
      throw new RpcError("Invalid Entrypoint", RpcErrorCodes.INVALID_REQUEST);
    }
    const validGasFees = await this.mempoolService.isNewOrReplacing(
      userOp,
      entryPoint
    );
    if (!validGasFees) {
      throw new RpcError(
        "User op cannot be replaced: fee too low",
        RpcErrorCodes.INVALID_USEROP
      );
    }
    await this.userOpValidationService.simulateValidation(userOp, entryPoint);
    return true;
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
    const [entryPoint, event] = await this.getUserOperationEvent(hash);
    if (!entryPoint || !event) {
      return null;
    }
    const tx = await event.getTransaction();
    if (tx.to !== entryPoint.address) {
      throw new Error("unable to parse transaction");
    }
    const parsed = entryPoint.interface.parseTransaction(tx);
    const ops: UserOperationStruct[] = parsed?.args.ops;
    if (ops.length == 0) {
      throw new Error("failed to parse transaction");
    }
    const op = ops.find(
      (o) =>
        o.sender === event.args.sender &&
        BigNumber.from(o.nonce).eq(event.args.nonce)
    );
    if (!op) {
      throw new Error("unable to find userOp in transaction");
    }

    const {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
      signature,
    } = op;

    return deepHexlify({
      userOperation: {
        sender,
        nonce,
        initCode,
        callData,
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        paymasterAndData,
        signature,
      },
      entryPoint: entryPoint.address,
      transactionHash: tx.hash,
      blockHash: tx.blockHash ?? "",
      blockNumber: tx.blockNumber ?? 0,
    });
  }

  /**
   *
   * @param hash user op hash
   * @returns a UserOperation receipt
   */
  async getUserOperationReceipt(
    hash: string
  ): Promise<UserOperationReceipt | null> {
    const [entryPoint, event] = await this.getUserOperationEvent(hash);
    if (!event || !entryPoint) {
      return null;
    }
    const receipt = await event.getTransactionReceipt();
    const logs = this.filterLogs(event, receipt.logs);
    return deepHexlify({
      userOpHash: hash,
      sender: event.args.sender,
      nonce: event.args.nonce,
      actualGasCost: event.args.actualGasCost,
      actualGasUsed: event.args.actualGasUsed,
      success: event.args.success,
      logs,
      receipt,
    });
  }

  /**
   *
   * @param sender senders address
   * @returns a UserOperation array
   */
  async getUserOperations(
    sender: string
  ): Promise<Array<AdvancedOpMempoolEntry | null>> {
    const timebasedContions: Array<Conditions> = [
      {
        key: "sender",
        expectedValue: sender,
        comparisionConditions: ComparisionConditions.EQ,
      }
    ]

    // for time based transactions
    const advancedMempoolEntry: Array<AdvancedOpMempoolEntry> = await this.advancedMempoolService.fetchAllConditional(timebasedContions);
    // const userUserOps = advancedMempoolEntry.filter((entry: AdvancedOpMempoolEntry) => entry.userOp.sender === sender)
    // this.logger.info("userUserOps", userUserOps)

    return advancedMempoolEntry
  }

  /**
   * eth_chainId
   * @returns EIP-155 Chain ID.
   */
  async getChainId(): Promise<number> {
    return (await this.provider.getNetwork()).chainId;
  }

  /**
   * Returns an array of the entryPoint addresses supported by the client
   * The first element of the array SHOULD be the entryPoint addresses preferred by the client.
   * @returns Entry points
   */
  async getSupportedEntryPoints(): Promise<string[]> {
    return this.config.entryPoints.map((address) =>
      ethers.utils.getAddress(address)
    );
  }

  private validateEntryPoint(entryPoint: string): boolean {
    return (
      this.config.entryPoints.findIndex(
        (ep) => ep.toLowerCase() === entryPoint.toLowerCase()
      ) !== -1
    );
  }

  static DefaultGasOverheads = {
    fixed: 21000,
    perUserOp: 18300,
    perUserOpWord: 4,
    zeroByte: 4,
    nonZeroByte: 16,
    bundleSize: 1,
    sigSize: 65,
  };

  /**
   * calculate the preVerificationGas of the given UserOperation
   * preVerificationGas (by definition) is the cost overhead that can't be calculated on-chain.
   * it is based on parameters that are defined by the Ethereum protocol for external transactions.
   * @param userOp filled userOp to calculate. The only possible missing fields can be the signature and preVerificationGas itself
   * @param overheads gas overheads to use, to override the default values
   */
  private calcPreVerificationGas(
    userOp: Partial<UserOperationStruct>,
    overheads?: Partial<typeof Eth.DefaultGasOverheads>
  ): number {
    const ov = { ...Eth.DefaultGasOverheads, ...(overheads ?? {}) };
    const p: UserOperationStruct = {
      // dummy values, in case the UserOp is incomplete.
      preVerificationGas: 21000, // dummy value, just for calldata cost
      signature: hexlify(Buffer.alloc(ov.sigSize, 1)), // dummy signature
      ...userOp,
    } as any;

    const packed = arrayify(packUserOp(p, false));
    const lengthInWord = (packed.length + 31) / 32;
    const callDataCost = packed
      .map((x) => (x === 0 ? ov.zeroByte : ov.nonZeroByte))
      .reduce((sum, x) => sum + x);
    const ret = Math.round(
      callDataCost +
      ov.fixed / ov.bundleSize +
      ov.perUserOp +
      ov.perUserOpWord * lengthInWord
    );
    return ret;
  }

  private async getUserOperationEvent(
    userOpHash: string
  ): Promise<[EntryPoint | null, UserOperationEventEvent | null]> {
    let event: UserOperationEventEvent[] = [];
    for (const addr of await this.getSupportedEntryPoints()) {
      const contract = EntryPoint__factory.connect(addr, this.provider);
      try {
        event = await contract.queryFilter(
          contract.filters.UserOperationEvent(userOpHash)
        );
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (event[0]) {
          return [contract, event[0]];
        }
      } catch (err) {
        throw new RpcError(
          "Missing/invalid userOpHash",
          RpcErrorCodes.METHOD_NOT_FOUND
        );
      }
    }
    return [null, null];
  }

  private filterLogs(userOpEvent: UserOperationEventEvent, logs: Log[]): Log[] {
    let startIndex = -1;
    let endIndex = -1;
    logs.forEach((log, index) => {
      if (log?.topics[0] === userOpEvent.topics[0]) {
        // process UserOperationEvent
        if (log.topics[1] === userOpEvent.topics[1]) {
          // it's our userOpHash. save as end of logs array
          endIndex = index;
        } else {
          // it's a different hash. remember it as beginning index, but only if we didn't find our end index yet.
          if (endIndex === -1) {
            startIndex = index;
          }
        }
      }
    });
    if (endIndex === -1) {
      throw new Error("fatal: no UserOperationEvent in logs");
    }
    return logs.slice(startIndex + 1, endIndex);
  }
}
