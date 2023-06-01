export interface IDbController {
  get<T>(key: string): Promise<T>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  put(key: string, value: Object): Promise<void>;
  del(key: string): Promise<void>;
  getMany<T>(keys: string[]): Promise<T[]>;
  start(): Promise<void>;
  stop(): Promise<void>;
  findConditional(conditions: Array<Conditions>): Promise<any[]>;
}

export enum ComparisionConditions {
  GT,
  LT,
  EQ
}

export interface Conditions {
  key: string;
  expectedValue: any;
  comparisionConditions: ComparisionConditions
}