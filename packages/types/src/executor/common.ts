import { BigNumberish, BytesLike } from "ethers";

export interface AdvancedUserOperation {
    executionWindowStart: BigNumberish;
    executionWindowEnd: BigNumberish;
    readyForExecution: boolean | undefined;
}
export type CustomUserOperationStruct = {
    sender: string;
    nonce: BigNumberish;
    initCode: BytesLike;
    callData: BytesLike;
    callGasLimit: BigNumberish;
    verificationGasLimit: BigNumberish;
    preVerificationGas: BigNumberish;
    maxFeePerGas: BigNumberish;
    maxPriorityFeePerGas: BigNumberish;
    paymasterAndData: BytesLike;
    signature: BytesLike;
    advancedUserOperation?: AdvancedUserOperation | undefined;
};
