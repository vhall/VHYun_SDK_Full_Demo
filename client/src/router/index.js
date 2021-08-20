import Vue from 'vue'
import VueRouter from 'vue-router'
import { checkBrowserEnv, IDENTITY } from '@/utils'
import { inavApi, roomApi } from '@/common/api'
// import createStore from '../store/index'
import Home from '../views/home/index'

Vue.use(VueRouter)

const routes = [
  // 进入
  {
    path: '/',
    name: 'home',
    component: Home
  },
  // 直播
  {
    path: '/:vtype(publisher|helper)/:roomId',
    name: 'main',
    component: () => import(/* webpackChunkName: "main-mangle" */ '../views/main-mangle/index.vue'),
    beforeEnter: async function (to, from, next){
      const envCheckResult = checkBrowserEnv()
      if (envCheckResult) {
        alert(envCheckResult)
        return next('/')
      }

      const roomId = to.params.roomId
      const vtype = to.params.vtype
      const panelist = to.query.panelist
      const nickName = to.query.nickName || ('用户' + Math.random().toString().slice(2, 7))
      // 跳转到进入直播间页面
      if (!roomId) return next('/') // next(new Error('roomId错误'))
      const identity = vtype === 'publisher' ? IDENTITY.master : vtype === 'helper' ? IDENTITY.helper : panelist ? IDENTITY.guest : IDENTITY.player
      if (!window.token) {
        const rs0 = await roomApi.login(nickName)
        window.token = rs0.token
      }
      try {
        const rs = await roomApi.enter(roomId, '', identity)
        to.matched[0].props.default = { viewData: rs }
      } catch (e) {
        next(from)
        return alert(e.message)
      }
      inavApi.roomId = roomId
      next()
    },
    beforeLeave: function (to, from, next){
      inavApi.roomId = null
      window.token = null
    }
  },
  // 观看直播
  {
    path: '/watcher/:roomId',
    name: 'watcher',
    component: () => import(/* webpackChunkName: "main-watcher" */ '../views/main-watcher/index.vue'),
    beforeEnter: async function (to, from, next){
      const envCheckResult = checkBrowserEnv()
      if (envCheckResult) {
        alert(envCheckResult)
        return next('/')
      }

      const roomId = to.params.roomId
      const panelist = to.query.panelist
      const nickName = to.query.nickName || ('用户' + Math.random().toString().slice(2, 7))
      // 跳转到进入直播间页面
      if (!roomId) return next('/') // next(new Error('roomId错误'))
      const identity = panelist ? IDENTITY.guest : IDENTITY.player
      if (!window.token) {
        const rs0 = await roomApi.login(nickName)
        window.token = rs0.token
      }
      try {
        const rs = await roomApi.enter(roomId, '', identity)
        to.matched[0].props.default = { viewData: rs }
      } catch (e) {
        next(from)
        return alert(e.message)
      }
      inavApi.roomId = roomId
      next()
    },
    beforeLeave: function (to, from, next){
      inavApi.roomId = null
      window.token = null
    }
  },
  // 点播
  {
    path: '/vod/:roomId',
    name: 'vod',
    component: () => import(/* webpackChunkName: "main-watcher" */ '../views/main-watcher/index.vue'),
    beforeEnter: async function (to, from, next){
      const envCheckResult = checkBrowserEnv()
      if (envCheckResult) {
        alert(envCheckResult)
        return next('/')
      }

      const roomId = to.params.roomId
      const nickName = to.query.nickName || ''
      // 跳转到进入直播间页面
      if (!roomId) return next('/') // next(new Error('roomId错误'))
      if (!window.token) {
        const rs0 = await roomApi.login(nickName)
        window.token = rs0.token
      }
      try {
        const rs = await roomApi.vod(roomId, '')
        to.matched[0].props.default = { viewData: rs }
      } catch (e) {
        next(from)
        return alert(e.message)
      }
      inavApi.roomId = roomId
      next()
    },
    beforeLeave: function (to, from, next){
      inavApi.roomId = null
      window.token = null
    }
  }
]

const router = new VueRouter({
  mode: 'history',
  // base: process.env.BASE_URL,
  routes
})

export default router
