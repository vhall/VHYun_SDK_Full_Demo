import Vue from 'vue'
import Vuex from 'vuex'
import { IDENTITY, localStoragePrefix } from '@/utils'
import { mutations } from './mutations'
import { actions } from './actions'
import { getters } from './getters'
import { safeParse } from '@/utils'

Vue.use(Vuex)

const state = () => {
  // 选择的本地设备
  const localStreamOption = safeParse(window.sessionStorage.getItem(localStoragePrefix + 'localStreamOption1'))
  if (localStreamOption) delete localStreamOption.attributes
  // 侧边栏
  const side_active = window.sessionStorage.getItem(localStoragePrefix + 'menu_type') || 'board'
  // 申请上麦小红点
  const redDotInvaRequest = window.sessionStorage.getItem(localStoragePrefix + 'invaRequestList')

  return ({
    // 消息列表
    imMessageList: [],
    // 侧边栏
    side_active,
    // 选择的本地设备
    localStreamOption,
    // 申请上麦小红点
    redDotInvaRequest: !!redDotInvaRequest,
    // 大小窗口切换
    smChange: false,
    // 聊天sdk
    chat: null,
    // 互动sdk
    rtc: null,
    // 当前用户
    user: {
      accountId: '',
      userId: '',
      avatar: '',
      nickName: '',
      identity: IDENTITY.guest
    },
    // 当前房间信息
    room: {
      title: '',
      roomId: '',
      isVod: false,
      liveStartAt: 0
    },
    // sdk option
    sdkOption: {
      appId: '',
      accountId: '',
      token: '',
      paasLiveId: '',
      paasInavId: '',
      paasImId: '',
      recordId: '',
      isVod: false
    },

    // 聊天
    imOnline: false,
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
    liveChanging: false,
    liveStatus: 1,
    liveStartAt: 0,

    docChapters: [],

    // 互动流
    stream: {
      masterUserId: null,
      local: null,
      desktop: null,
      masterLocal: null,
      masterDesktop: null,
      remote: []
    }
  })
}

export function createStore(){
  return new Vuex.Store({
    state: state(),
    mutations: mutations,
    actions: actions,
    getters: getters,
    modules: {}
  })
}

export default new Vuex.Store({
  state: state(),
  mutations: mutations,
  actions: actions,
  getters: getters,
  modules: {}
})
