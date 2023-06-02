import { ComparisionConditions } from "types/lib/db/IDbController";

export const findVal = (objectStr: any, key: any, expectedValue: any, comparisionCondition: ComparisionConditions): boolean => {
  let searchResult = false;
  let object: any;
  if (typeof objectStr === "string") {
    object = JSON.parse(objectStr);

  } else if (typeof objectStr === "object") {
    object = objectStr;
  }
  Object.keys(object).some((k): any => {

    if (k === key) {
      console.log("data key:", key, ":", object[k]);
      searchResult = comparisions(object[k], expectedValue, comparisionCondition);
      console.log("Search result1: ", searchResult);
      return searchResult;
    }
    if (object[k] && typeof object[k] === 'object') {
      searchResult = findVal(object[k], key, expectedValue, comparisionCondition);
      return searchResult;
    } else {
      return searchResult;

    }

  });
  console.log("Search result:", searchResult)
  return searchResult;
}

export const comparisions = (value: any, expectedValue: any, comparisionCondition: ComparisionConditions): boolean => {
  if (typeof expectedValue !== 'number') {
    if (value === expectedValue) {
      return true;
    } else {
      false
    }
  } else {
    let _value = value;
    if (typeof value !== 'number') {
      _value = parseInt(value);
    }
    if (comparisionCondition == ComparisionConditions.LT) {
      if (_value > expectedValue) {

        console.log("comparisionCondition == ComparisionConditions.LT", "value:", _value, "expectedValue:", expectedValue)
        return true;
      } else {
        false
      }
    } else if (comparisionCondition == ComparisionConditions.GT) {

      if (_value < expectedValue) {
        console.log("comparisionCondition == ComparisionConditions.GT", "value:", _value, "expectedValue:", expectedValue)

        return true;
      } else {
        false
      }
    } else if (comparisionCondition == ComparisionConditions.EQ) {
      console.log("comparisionCondition == ComparisionConditions.EQ", "value:", _value, "expectedValue:", expectedValue)

      if (_value === expectedValue) {
        return true;
      } else {
        false
      }
    }
  }
  return false;
}