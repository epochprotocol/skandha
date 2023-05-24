import { BigNumberish, BytesLike } from "ethers";
import { AdvancedUserOperation, CustomUserOperationStruct } from "types/src/executor/common";

export interface IMempoolEntry {
  chainId: number;
  userOp: CustomUserOperationStruct;
  entryPoint: string;
  prefund: BigNumberish;
  aggregator?: string;
  hash?: string;
}
export interface IAdvancedOpMempoolEntry {
  chainId: number;
  userOp: CustomUserOperationStruct;
  entryPoint: string;
  aggregator?: string;
  hash?: string;
}
export interface MempoolEntrySerialized {
  chainId: number;
  userOp: {
    sender: string;
    nonce: string;
    initCode: BytesLike;
    callData: BytesLike;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymasterAndData: BytesLike;
    signature: BytesLike;
    advancedUserOperation?: AdvancedUserOperation;
  };
  prefund?: string;
  aggregator: string | undefined;
  hash: string | undefined;
}

export interface IReputationEntry {
  chainId: number;
  address: string;
  opsSeen: number;
  opsIncluded: number;
  lastUpdateTime: number;
}

export type ReputationEntryDump = Omit<
  IReputationEntry,
  "chainId" | "lastUpdateTime"
> & { status: string };

export type ReputationEntrySerialized = Omit<
  IReputationEntry,
  "address" | "chainId"
>;

export enum ReputationStatus {
  OK = "ok",
  THROTTLED = "throttled",
  BANNED = "banned",
}
