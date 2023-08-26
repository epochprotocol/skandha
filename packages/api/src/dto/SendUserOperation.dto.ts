import { Type } from "class-transformer";
import {
	IsBoolean,
	IsDefined,
	IsEthereumAddress,
	IsObject,
	IsString,
	ValidateNested,
} from "class-validator";
import { BigNumberish, BytesLike } from "ethers";
import { IsCallData } from "../utils/IsCallCode";
import { IsBigNumber } from "../utils/is-bignumber";

export class SendUserOperationStruct {
	@IsEthereumAddress()
	sender!: string;
	@IsBigNumber()
	nonce!: BigNumberish;
	@IsString()
	@IsCallData()
	initCode!: BytesLike;
	@IsString()
	callData!: BytesLike;
	@IsBigNumber()
	verificationGasLimit!: BigNumberish;
	@IsBigNumber()
	preVerificationGas!: BigNumberish;
	@IsBigNumber()
	maxFeePerGas!: BigNumberish;
	@IsBigNumber()
	maxPriorityFeePerGas!: BigNumberish;
	@IsString()
	@IsCallData()
	paymasterAndData!: BytesLike;
	@IsString()
	signature!: BytesLike;
	@IsBigNumber()
	callGasLimit!: BigNumberish;
	@Type(() => AdvancedUserOperationStruct)
	advancedUserOperationStruct!: AdvancedUserOperationStruct;
}

export class AdvancedUserOperationStruct {
	@IsBigNumber()
	executionWindowStart?: BigNumberish;
	@IsBigNumber()
	executionWindowEnd?: BigNumberish;
	@IsBoolean()
	readyForExecution: boolean | undefined;
	@IsString()
	dependant?: string | undefined;
}

export class SendUserOperationGasArgs {
	@IsDefined()
	@IsObject()
	@ValidateNested()
	@Type(() => SendUserOperationStruct)
	userOp!: SendUserOperationStruct;

	@IsEthereumAddress()
	entryPoint!: string;
}
