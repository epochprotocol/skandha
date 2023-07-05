// eslint-disable-next-line import/no-extraneous-dependencies
import { IDbController } from "types/lib";
import { findVal } from "./utils";
import { Conditions } from "types/src/db/IDbController";

enum Status {
  started = "started",
  stopped = "stopped",
}

export class LocalDbController implements IDbController {
  private namespace: string;
  private status = Status.stopped;
  private db: {
    [key: string]: any;
  } = {};

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  async get<T>(key: string): Promise<T> {
    key = `${this.namespace}:${key}`;
    const value = this.db[key];
    if (!value) {
      throw new Error("Not Found");
    }
    try {
      return JSON.parse(value as string);
    } catch (_) {
      return value as T;
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  async put(key: string, value: Object): Promise<void> {
    key = `${this.namespace}:${key}`;
    this.db[key] = JSON.stringify(value);
  }

  async del(key: string): Promise<void> {
    key = `${this.namespace}:${key}`;
    delete this.db[key];
  }

  async getMany<T>(keys: string[]): Promise<T[]> {
    return keys.map((key) => {
      key = `${this.namespace}:${key}`;
      const value = this.db[key];
      if (!value) {
        throw new Error("Not Found");
      }
      try {
        return JSON.parse(value as string);
      } catch (_) {
        return value as T;
      }
    });
  }

  async findConditional(conditions: Array<Conditions>, keys: Array<string>): Promise<any[]> {
    const searchResults: Array<any> = [];
    const conditionsResults: Array<boolean> = []
    console.log("DB Entry: ", this.db)
    for (let i = 0; i < conditions.length; i++) {
      {
        console.log("DB keys:", keys);
        const _condition = conditions[i];
        keys.forEach((entryKey) => {
          const entry = this.db[`${this.namespace}:${entryKey}`];
          console.log("DB Entry data:", entry)
          const searchResult = findVal(entry, _condition.key, _condition.expectedValue, _condition.comparisionConditions);
          console.log("searchResult: ", searchResult);
          conditionsResults.push(searchResult)
          if (searchResult === true) {
            let _entry = entry;
            if (typeof entry === 'string') {
              _entry = JSON.parse(entry);
            }
            searchResults.push(_entry);
          }
        })
      }
    }
    console.log("conditionsResults: ", conditionsResults);
    
    if(conditionsResults.includes(false) || conditionsResults.length === 0){
      return []
    }

    return searchResults;
  }

  async start(): Promise<void> {
    if (this.status === Status.started) return;
    this.status = Status.started;
  }

  async stop(): Promise<void> {
    if (this.status === Status.stopped) return;
    this.status = Status.stopped;
  }



}
