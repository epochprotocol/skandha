import { registerDecorator, ValidationOptions } from 'class-validator';
import { BigNumber } from 'ethers';

export function IsBigNumber(options: ValidationOptions = {}) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      propertyName,
      options: {
        message: `${propertyName} must be a big number`,
        ...options
      },
      name: 'isBigNumber',
      target: object.constructor,
      constraints: [],
      validator: {
        validate(value: any): boolean {
          try {
            return BigNumber.isBigNumber(BigNumber.from(value));
          } catch (_) {
            return false;
          }
        }
      }
    });
  };
}
