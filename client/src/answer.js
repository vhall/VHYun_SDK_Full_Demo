import Vue from 'vue'
import Message from '@/components/Message'
import Answer from './views/answer/index.vue'
import './assets/less/reset.css'
import './assets/less/transition.less'
import './assets/less/iconfont/iconfont.css'
import './assets/less/common.less'
import './element'

Vue.config.productionTip = false
Vue.prototype.$message = Message

addEventListener('load', () => {
  new Vue({ render: h => h(Answer) }).$mount('#app')
})
