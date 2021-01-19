import Vue from 'vue'
import Vuex from 'vuex'
import {IDENTITY} from "@/utils"
import {mutations} from './mutations'
import {actions} from './actions'
import {getters} from './getters'
Vue.use(Vuex)

const state = {
  user: {
    userId: '',
    avatar: '',
    nickName: '',
    identity: IDENTITY.guest
  },
  side_active: sessionStorage.getItem('menu_type') || 'board',
  sdk: {
    $rtc: null,
    $chat: null,
    $doc: null,
    $player:null
  },
  room: {
    title: '',
    roomId: '',
    isVod: false,
    liveStartAt: 0,
  },
  sdkOption: {
    appId: '',
    accountId: '',
    token: '',
    paasLiveId: '',
    paasInavId: '',
    paasImId: '',
    isVod: false
  },

  redDotInvaRequest: false,

  // 聊天
  imDisable: false,
  imDisableAll: false,
  imOnlineUserTotal: 0,
  imUserList: [],
  imBlackUserSet: {},

  // 互动
  invaUserList: [],
  invaBlackUserSet: {},

  userList: [],
  userMap: {},

  // 直播
  live: false,
  liveStartAt: 0,

  localStreamOption: null,
  stream: {
    masterUserId: null,
    local: null,
    desktop: null,
    masterLocal: null,
    masterDesktop: null,
    remote: []
  }
}

export default new Vuex.Store({
  state: state,
  mutations: mutations,
  actions: actions,
  getters:getters,
  modules: {}
})
