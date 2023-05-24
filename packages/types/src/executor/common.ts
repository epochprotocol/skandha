import { BigNumberish, BytesLike } from "ethers";
import { UserOperationStruct } from "./contracts/EntryPoint";

export interface AdvancedUserOperation {
    executionWindowStart?: BigNumberish;
    executionWindowEnd?: BigNumberish;
    readyForExecution?: boolean | undefined;
}
export interface CustomUserOperationStruct extends UserOperationStruct {
    advancedUserOperation?: AdvancedUserOperation | undefined;
};
