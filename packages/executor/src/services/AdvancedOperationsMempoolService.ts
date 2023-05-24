import { BigNumberish } from "ethers";
import { IDbController } from "types/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { getAddr, now } from "../utils";
import { MempoolEntry } from "../entities/MempoolEntry";
import { IAdvancedOpMempoolEntry, IMempoolEntry, MempoolEntrySerialized } from "../entities/interfaces";
import { ReputationService } from "./ReputationService";
import { StakeInfo } from "./UserOpValidation";
import { CustomUserOperationStruct } from "types/src/executor/common";
import { AdvancedOpMempoolEntry } from "../entities/AdvancedOpMempoolEntry";

export class AdvancedOperationMempoolService {
    private MAX_MEMPOOL_USEROPS_PER_SENDER = 4;
    private ADVANCED_USEROP_COLLECTION_KEY: string;

    constructor(
        private db: IDbController,
        private chainId: number,
        private reputationService: ReputationService
    ) {
        this.ADVANCED_USEROP_COLLECTION_KEY = `${chainId}:ADVANCEDUSEROPKEYS`;
    }


    async count(): Promise<number> {
        const advancedUserOpKeys: string[] = await this.fetchKeys();
        return advancedUserOpKeys.length;
    }

    async dump(): Promise<MempoolEntrySerialized[]> {
        return (await this.fetchAll()).map((entry) => entry.serialize());
    }

    async addAdvancedUserOp(
        userOp: CustomUserOperationStruct,
        entryPoint: string,
        hash?: string,
        aggregator?: string
    ): Promise<void> {
        const entry = new AdvancedOpMempoolEntry({
            chainId: this.chainId,
            userOp,
            entryPoint,
            aggregator,
            hash,
        });
        const existingEntry = await this.find(entry);
        if (existingEntry) {
            if (!entry.canReplace(existingEntry)) {
                throw new RpcError(
                    "User op cannot be replaced: fee too low",
                    RpcErrorCodes.INVALID_USEROP
                );
            }
            await this.db.put(this.getKey(entry), {
                ...entry,
                lastUpdatedTime: now(),
            });
        } else {
            const advancedUserOpKeys = await this.fetchKeys();
            const key = this.getKey(entry);
            advancedUserOpKeys.push(key);
            await this.db.put(this.ADVANCED_USEROP_COLLECTION_KEY, advancedUserOpKeys);
            await this.db.put(key, { ...entry, lastUpdatedTime: now() });
        }
        await this.updateSeenStatus(userOp, aggregator);
    }

    async remove(entry: MempoolEntry | null): Promise<void> {
        if (!entry) {
            return;
        }
        const key = this.getKey(entry);
        const newKeys = (await this.fetchKeys()).filter((k) => k !== key);
        await this.db.del(key);
        await this.db.put(this.ADVANCED_USEROP_COLLECTION_KEY, newKeys);
    }

    async removeUserOp(userOp: CustomUserOperationStruct): Promise<void> {
        const entry = new MempoolEntry({
            chainId: this.chainId,
            userOp,
            entryPoint: "",
            prefund: 0,
        });
        await this.remove(entry);
    }

    async getSortedOps(): Promise<MempoolEntry[]> {
        const allEntries = await this.fetchAll();
        return allEntries.sort(MempoolEntry.compareByCost);
    }

    async clearState(): Promise<void> {
        const keys = await this.fetchKeys();
        for (const key of keys) {
            await this.db.del(key);
        }
        await this.db.del(this.ADVANCED_USEROP_COLLECTION_KEY);
    }

    /**
     * checks if the userOp is new or can replace the existing userOp in mempool
     * @returns true if new or replacing
     */
    async isNewOrReplacing(
        userOp: CustomUserOperationStruct,
        entryPoint: string
    ): Promise<boolean> {
        const entry = new AdvancedOpMempoolEntry({
            chainId: this.chainId,
            userOp,
            entryPoint,
        });
        const existingEntry = await this.find(entry);
        return !existingEntry || entry.canReplace(existingEntry);
    }

    private async find(entry: AdvancedOpMempoolEntry): Promise<AdvancedOpMempoolEntry | null> {
        const raw = await this.db
            .get<IMempoolEntry>(this.getKey(entry))
            .catch(() => null);
        if (raw) {
            return this.rawEntryToMempoolEntry(raw);
        }
        return null;
    }

    private getKey(entry: IAdvancedOpMempoolEntry): string {
        return `advancedOp${this.chainId}:${entry.userOp.sender}:${entry.userOp.nonce}`;
    }

    private async fetchKeys(): Promise<string[]> {
        const advancedUserOpKeys = await this.db
            .get<string[]>(this.ADVANCED_USEROP_COLLECTION_KEY)
            .catch(() => []);
        return advancedUserOpKeys;
    }

    private async fetchAll(): Promise<MempoolEntry[]> {
        const keys = await this.fetchKeys();
        const rawEntries = await this.db
            .getMany<MempoolEntry>(keys)
            .catch(() => []);
        return rawEntries.map(this.rawEntryToMempoolEntry);
    }

    private async checkSenderCountInMempool(
        userOp: CustomUserOperationStruct,
        userInfo: StakeInfo
    ): Promise<string | null> {
        const entries = await this.fetchAll();
        const count: number = entries.filter(
            ({ userOp: { sender } }) => sender === userOp.sender
        ).length;
        if (count >= this.MAX_MEMPOOL_USEROPS_PER_SENDER) {
            return this.reputationService.checkStake(userInfo);
        }
        return null;
    }

    private async updateSeenStatus(
        userOp: CustomUserOperationStruct,
        aggregator?: string
    ): Promise<void> {
        const paymaster = getAddr(userOp.paymasterAndData);
        const sender = getAddr(userOp.initCode);
        if (aggregator) {
            await this.reputationService.updateSeenStatus(aggregator);
        }
        if (paymaster) {
            await this.reputationService.updateSeenStatus(paymaster);
        }
        if (sender) {
            await this.reputationService.updateSeenStatus(sender);
        }
    }

    private rawEntryToMempoolEntry(raw: IMempoolEntry): MempoolEntry {
        return new MempoolEntry({
            chainId: raw.chainId,
            userOp: raw.userOp,
            entryPoint: raw.entryPoint,
            prefund: raw.prefund,
            aggregator: raw.aggregator,
            hash: raw.hash,
        });
    }
}
