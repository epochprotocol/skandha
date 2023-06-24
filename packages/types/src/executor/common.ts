import { BigNumberish, BytesLike } from "ethers";
import { UserOperationStruct } from "./contracts/EntryPoint";

export interface AdvancedUserOperation {
    executionWindowStart?: BigNumberish;
    executionWindowEnd?: BigNumberish;
    readyForExecution?: boolean | undefined;
    triggerEvent?: TriggerEvent
}
export interface CustomUserOperationStruct extends UserOperationStruct {
    advancedUserOperation?: AdvancedUserOperation | undefined;
};

export interface TriggerEvent {
    contractAddress: string;
    eventSignature: string;
    eventLogHash: string;
}
