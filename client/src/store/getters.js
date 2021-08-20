import { IDENTITY } from '@/utils'

export const getters = {
  getSdkOption(state){
    return state.sdkOption
  },
  getUser(state){
    return state.user
  },
  chat(state){
    return state.chat
  },
  rtc(state){
    return state.rtc
  },
  roomId(state) {
    return state.room.roomId
  },
  livein(state) {
    return state.liveStatus === 3
  },
  liveStatus(state) {
    return state.liveStatus || 1
  },
  accountId(state) {
    return state.user.userId
  },
  identity(state) {
    return state.user.identity
  },
  isMaster(state) {
    return state.user.identity === IDENTITY.master
  },
  isPlayer(state) {
    return state.user.identity === IDENTITY.player || state.user.identity === IDENTITY.guest
  },
  isVod(state) {
    return state.room && state.room.isVod
  },
  // 是否有在推流（在麦上）(自己)
  hasMeStreamPublish(state) {
    return !!state.stream.local
  },
  hasOp(state) {
    return state.user.identity === IDENTITY.helper || state.user.identity === IDENTITY.master
  },
  showDesktopShareContent(state){
    return state.stream.desktop || state.stream.masterDesktop
  }
}
