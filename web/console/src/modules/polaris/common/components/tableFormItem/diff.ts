function objDiff(currentObj, targetObj, compareKeys) {
  let diff = {};
  for (let key in currentObj) {
    if (compareKeys.indexOf(key) !== -1) { // 只针对了第一层
      if (!targetObj) {
        diff[key] = currentObj[key];
      } else if (typeof currentObj[key] === 'object' && typeof targetObj[key] === 'object' && currentObj[key] && targetObj[key]) {
        diff[key] = objDiff(currentObj[key], targetObj[key], compareKeys); // 第三个参数看看是不是可以不写
      } else if (currentObj[key] !== targetObj[key]) {
        diff[key] = currentObj[key];
      }
    }
  }
  return diff;
}
function arrDiff(currentArr, targetArr, compareKeys) {
  const diff = currentArr.map((item, index) => {
    return objDiff(item, targetArr[index], compareKeys);
  });
  return diff;
}

let targetArr = [{
  firstname: 'John', lastname: 'Cena', privateInfo: { privateProperty1: false, privateProperty2: true }
},
  { firstname: 'John' },
  { firstname: 'John' }
];
let currentArr = [{
  firstname: 'John', middlename: 'Felix', lastname: 'Pina', privateInfo: { privateProperty1: true, privateProperty2: true }
},
  {
    firstname: 'John',
  },
  { firstname: 'Johntest' },
  {
    firstname: 'test'
  }
];
console.log(arrDiff(currentArr, targetArr, ['firstname']));

export { arrDiff, objDiff };
