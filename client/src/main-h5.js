import Vue from 'vue'
import App from './AppH5.vue'
import router from './router/index-h5'
import Message from './components/Message'
import './utils/patch'
import './assets/less/reset.css'
import './assets/less/transition.less'
import './assets/less/iconfont/iconfont.css'
import './assets/less/common.less'
import './element'

Vue.config.productionTip = false
Vue.prototype.$message = Message

addEventListener('load', () => {
  new Vue({
    router,
    render: h => h(App)
  }).$mount('#app')
})