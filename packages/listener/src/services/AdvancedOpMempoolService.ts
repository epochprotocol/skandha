import { IDbController } from "types/lib";
import { now } from "../utils";
import { MempoolEntry } from "../entities/MempoolEntry";
import { IAdvancedOpMempoolEntry, IMempoolEntry, MempoolEntrySerialized } from "../entities/interfaces";
import { CustomUserOperationStruct } from "types/src/executor/common";
import { AdvancedOpMempoolEntry } from "../entities/AdvancedOpMempoolEntry";
import { Conditions } from "types/src";
import { ethers } from "ethers";
import _ from "lodash";

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
        console.log("existingEntry: ", existingEntry);
        if (existingEntry) {
            // if (!entry.canReplace(existingEntry)) {
            //     throw new RpcError(
            //         "User op cannot be replaced: fee too low",
            //         RpcErrorCodes.INVALID_USEROP
            //     );
            // }
            console.log("asdfasdfsadfsdfdsdsfqeqw",(_.isEqual(userOp.advancedUserOperation, existingEntry.userOp.advancedUserOperation)))
            if(!(_.isEqual(userOp.advancedUserOperation, existingEntry.userOp.advancedUserOperation))){
                await this.remove(existingEntry);
            }
            const advancedUserOpKeys = await this.fetchKeys();
            console.log("advancedUserOpKeys1: ", advancedUserOpKeys);
            const key = this.getKey(entry);
            const newAdvancedUserOpKeys = [...advancedUserOpKeys, key]
            console.log("advancedUserOpKeys12: ", newAdvancedUserOpKeys);
            await this.db.put(this.ADVANCED_USEROP_COLLECTION_KEY, newAdvancedUserOpKeys);
            await this.db.put(key, { ...entry, lastUpdatedTime: now() });
        } else {
            const advancedUserOpKeys = await this.fetchKeys();
            console.log("advancedUserOpKeys2: ", advancedUserOpKeys);
            const key = this.getKey(entry);
            const newAdvancedUserOpKeys = [...advancedUserOpKeys, key]
            console.log("advancedUserOpKeys22: ", newAdvancedUserOpKeys);
            await this.db.put(this.ADVANCED_USEROP_COLLECTION_KEY, newAdvancedUserOpKeys);
            await this.db.put(key, { ...entry, lastUpdatedTime: now() });
        }
    }

    async remove(entry: AdvancedOpMempoolEntry | null): Promise<void> {
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
        console.log("conditions2: ", conditions);
        const keys = await this.fetchKeys();
        console.log("keys2: ", keys);
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

    public async fetchAllEventConditionals(events: ethers.providers.Log[]): Promise<AdvancedOpMempoolEntry[]> {
        const keys = await this.fetchKeys();

        let eventsAndKeys: any = []

        const filteredKeys = keys.filter((key: string) => {
            if(key.split(':').length === 4) {
                const logContractAndSignature = key.split(':')[3]
                const isEventinBlock = events.find(event => {
                    console.log("event: ", event.topics[0]);
                    return event.address + event.topics[0] === logContractAndSignature
                })
                if(isEventinBlock){
                    eventsAndKeys.push({
                        key,
                        event: isEventinBlock
                    })
                    return true
                }
            }
            return false
        })

        console.log("filetereedKeys", filteredKeys)
        console.log("eventsAndKeys", eventsAndKeys)

        const rawEntries = await this.db.findConditional([], filteredKeys)
            .catch(() => []);
        return rawEntries.map(this.rawEntryToMempoolEntry);
    }
}
