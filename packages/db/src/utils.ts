import { ComparisionConditions } from "types/src/db/IDbController";

export const findVal = (object: any, key: any, expectedValue: any, comparisionCondition: ComparisionConditions): boolean => {
  let searchResult = false;

  Object.keys(object).some((k): any => {
    if (k === key) {
      searchResult = comparisions(object[k], expectedValue, comparisionCondition);
      return searchResult;
    }
    if (object[k] && typeof object[k] === 'object') {
      searchResult = findVal(object[k], key, expectedValue, comparisionCondition);
      return searchResult;
    } else {
      searchResult = false;
    }
    return searchResult;

  });
  return searchResult;
}

export const comparisions = (value: any, expectedValue: any, comparisionCondition: ComparisionConditions): boolean => {
  if (typeof value !== 'number') {
    if (value === expectedValue) {
      return true;
    } else {
      false
    }
  } else {
    if (comparisionCondition == ComparisionConditions.LT) {
      if (value < expectedValue) {
        return true;
      } else {
        false
      }
    } else if (comparisionCondition == ComparisionConditions.GT) {
      if (value > expectedValue) {
        return true;
      } else {
        false
      }
    } else if (comparisionCondition == ComparisionConditions.EQ) {
      if (value === expectedValue) {
        return true;
      } else {
        false
      }
    }
  }
  return false;
}