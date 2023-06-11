import { BigNumberish } from "ethers";
import { IDbController } from "types/lib";
import RpcError from "types/lib/api/errors/rpc-error";
import * as RpcErrorCodes from "types/lib/api/errors/rpc-error-codes";
import { getAddr, now } from "../utils";
import { MempoolEntry } from "../entities/MempoolEntry";
import { IAdvancedOpMempoolEntry, IMempoolEntry, MempoolEntrySerialized } from "../entities/interfaces";
import { CustomUserOperationStruct } from "types/src/executor/common";
import { AdvancedOpMempoolEntry } from "../entities/AdvancedOpMempoolEntry";
import { Conditions } from "types/src";

export class AdvancedOperationMempoolService {
    private ADVANCED_USEROP_COLLECTION_KEY: string;

    constructor(
        private db: IDbController,
        private chainId: number,
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
            // if (!entry.canReplace(existingEntry)) {
            //     throw new RpcError(
            //         "User op cannot be replaced: fee too low",
            //         RpcErrorCodes.INVALID_USEROP
            //     );
            // }
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

    async getSortedOps(): Promise<AdvancedOpMempoolEntry[]> {
        const allEntries = await this.fetchAll();
        return allEntries.sort(AdvancedOpMempoolEntry.compareByCost);
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
            .get<AdvancedOpMempoolEntry>(this.getKey(entry))
            .catch(() => null);
        if (raw) {
            console.log(raw);
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

    private async fetchAll(): Promise<AdvancedOpMempoolEntry[]> {
        const keys = await this.fetchKeys();
        const rawEntries = await this.db
            .getMany<MempoolEntry>(keys)
            .catch(() => []);
        return rawEntries.map(this.rawEntryToMempoolEntry);
    }


    public async fetchAllConditional(conditions: Array<Conditions>): Promise<AdvancedOpMempoolEntry[]> {
        const keys = await this.fetchKeys();
        const rawEntries = await this.db.findConditional(conditions, keys)
            .catch(() => []);
        return rawEntries.map(this.rawEntryToMempoolEntry);
    }



    private rawEntryToMempoolEntry(raw: AdvancedOpMempoolEntry): AdvancedOpMempoolEntry {
        console.log("RAW Entry:", raw);
        console.log(typeof raw)
        console.log("RAW USEROP", typeof raw.userOp, raw.userOp);
        return new AdvancedOpMempoolEntry({
            chainId: raw.chainId,
            userOp: raw.userOp,
            entryPoint: raw.entryPoint,
            aggregator: raw.aggregator,
            hash: raw.hash,
        });
    }
}
