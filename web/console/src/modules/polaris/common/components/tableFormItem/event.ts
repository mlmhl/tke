const Event = (function() {
  let list = {},
      listen,
      trigger,
      remove,
      once,
      clean;

  // 无数组，创建数组后push
  listen = function(key, fn) {
    if (!list[key]) {
      list[key] = [];
    }
    // 如果这个fn之前没有监听过，push到队列
    if (list[key].indexOf(fn) === -1) {
      list[key].push(fn);
    }
  };

  // 不触发（触发函数数组不存在||为空）
  // 触发（有数组，依次触发）
  trigger = function() {
    let key = Array.prototype.shift.call(arguments), // 也可以用splice(0,1)[0]
        fns = list[key];
    if (!fns || fns.length === 0) {
      return false;
    }
    for (let i = fns.length - 1; i >= 0; i--) { // 必须倒序，因为once函数执行完删除函数会影响数组长度
      fns[i].apply(this, arguments);
    }
  };

  // 无法删除 （数组不存在或为空return false）
  // 全部删除 （不指定具体删除函数）
  // 删除某个（指定具体的函数）
  remove = function(key, fn) {
    let fns = list[key];
    if (!fns || fns.length === 0) {
      return false;
    }
    if (!fn) {
      fns.length = 0;
      return false;
    }
    for (let i = fns.length - 1; i >= 0; i--) {
      let _fn = fns[i];
      if (_fn === fn) {
        fns.splice(i, 1);
      }
    }
  };
  clean = function() {
    list = {};
  };
  once = function(key, fn) {
    function fun() {
      // var arr = Array.prototype.slice.apply(arguments);
      fn.apply(this, arguments);
      this.remove(key, fun);
    }
    this.add(key, fun);
  };
  return {
    listen,
    trigger,
    remove,
    once,
    clean
  };
})();
export default Event;
