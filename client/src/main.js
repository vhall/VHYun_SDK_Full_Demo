import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { videoAutoPlaySupport } from '@/utils/autoplay'
import './assets/less/reset.css'
import './assets/less/transition.less'
import './assets/less/iconfont/iconfont.css'
import './assets/less/common.less'
import Message from './components/Message'
import './element'

Vue.config.productionTip = false
Vue.prototype.$message = Message

Date.prototype.toLocaleDateString = function (){
  // 重写日期函数格式化日期 "2020-01-02"
  return `${this.getFullYear()}-${this.getMonth() + 1 >= 10 ? this.getMonth() + 1 : '0' + (this.getMonth() + 1)}-${
    this.getDate() >= 10 ? this.getDate() : '0' + this.getDate()
  }`
}

window.addEventListener('load', () => {
  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount('#app')

  // 提前测试是否支持自动播放
  setTimeout(() => {
    videoAutoPlaySupport()
  }, 100)
})
