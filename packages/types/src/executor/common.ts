import { BigNumberish } from "ethers";
import { UserOperationStruct } from "./contracts/EntryPoint";

export interface AdvancedUserOperation {
	executionWindowStart?: BigNumberish;
	executionWindowEnd?: BigNumberish;
	readyForExecution?: boolean | undefined;
	triggerEvent?: TriggerEvent;
	dependant?: string | undefined;
}
export interface CustomUserOperationStruct extends UserOperationStruct {
	advancedUserOperation?: AdvancedUserOperation | undefined;
}

export interface TriggerEvent {
	contractAddress: string;
	eventSignature: string;
	eventLogHash: string;
}
