import { ProjectResourceLimit, resourceTypeToUnit } from '@src/modules/common';

export function _reduceProjectLimit(projectResourceLimit: ProjectResourceLimit[] = []) {
  let hardInfo = {};
  projectResourceLimit.forEach(item => {
    let value;
    if (resourceTypeToUnit[item.type] === '个' || resourceTypeToUnit[item.type] === '核' || resourceTypeToUnit[item.type] === '毫核') {
      value = +item.value;
    } else {
      value = item.value + 'Mi';
    }
    hardInfo[item.type] = value;
  });
  return hardInfo;
}
