import VhDialog from './src/component';

VhDialog.open = function (Ctor, parent, options) {
  const vm = parent?.abstract ? parent : this?.abstract ? this : undefined
  const instance = new Ctor({ parent: vm })
  instance._props = options
  instance.$mount()
  instance.$on('close', () => instance.$destroy())
  return instance
}

/* istanbul ignore next */
VhDialog.install = function(Vue) {
  Vue.component(VhDialog.name, VhDialog);
}

export default VhDialog;
