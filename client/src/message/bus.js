import EventEmitter from 'eventemitter3'
import { BUS_CUSTOM_EVENTS, BUS_EVENTS, BUS_LOCAL_EVENTS, SPECIAL_ACCOUNT_ID } from '@/common/contant'
import { IDENTITY, promisify, safeParse, wait } from '@/utils'
import { createStore } from '@/store'
import { inavApi } from '@/common/api'
import { initChat } from '@/utils/sdk'

export function listenBus(event) {
  return function (target, key, descriptor) {
    if (!Array.isArray(target._preListens)) target._preListens = []
    target._preListens.push(function (i) {
      const fn = descriptor.value.bind(i)
      i.on('destroy', () => i.off(event, fn))
      i.on(event, fn)
    })
    return descriptor
  }
}

export class Bus extends EventEmitter {
  constructor() {
    super()
    this._destroy = false
    this.chat = null
    this.option = null
    this.accountId = null
    this.identity = null
    this.done = false
    this.vm = null
    this.store = createStore()
    for (const preListen of this._preListens) preListen(this)
  }

  setOption(option) {
    this.option = option
    this.accountId = option.accountId
    this.identity = option.identity
  }

  async init(){
    if (this.done) return
    this.done = true
    if (process.env.NODE_ENV !== 'production') console.time('初始化聊天SDK')
    const rs = await initChat(this.option)
    this.chat = rs.chat
    try {
      this.chat._historyListEscapeHtml = lists => lists
    } catch (e) {/**/}
    if (process.env.NODE_ENV !== 'production') console.timeEnd('初始化聊天SDK')
    if (typeof useMsgV4 === 'boolean' && useMsgV4 === true) this.listenV4()
    else this.listen()
    this.dispatch(rs.disableAll ? BUS_EVENTS.ROOM_MUTE_ALL : BUS_EVENTS.ROOM_UNMUTE_ALL, { data: [this.store.getters.accountId] })
    this.dispatch(rs.disable ? BUS_EVENTS.USER_MUTE : BUS_EVENTS.USER_UNMUTE, { data: [this.store.getters.accountId] })

    await wait(500)
    this.dispatch(BUS_LOCAL_EVENTS.CHAT_INIT, this.chat)

    this.getMessageList()
    this.getOnlineList()
  }

  async getMessageList(){
    if (this.chat.getLatelyHistoryList) {
      const rs = await this.chat.getLatelyHistoryList()
      for (const msg of rs.list) {
        this.dispatch(VhallChat.EVENTS.CHAT, msg)
      }
      return
    }

    const now = new Date()
    const endTime = now.toLocaleDateTimeString()
    const startTime = (new Date(now.getTime() - 1000 * 3600 * 24)).toLocaleDateTimeString()
    const rs = await new Promise((r, j) => this.chat.getHistoryList({ currPage: 1, pageSize: 20, startTime, endTime }, r, j))
    if (!Array.isArray(rs.list)) return
    for (const item of rs.list) {
      const msg = {
        msgId: item.msg_id || '',
        appId: '',
        channelId: '',
        sourceId: item.third_party_user_id || '',
        targetId: '',
        time: new Date(item.date_time).getTime(),
        context: (typeof item.context === 'string' ? safeParse(item.context) : item.context) || {},
        data: { }, // safeParse(item.data) || {},
        static: true,
      }
      if (item.type === 'text') {
        msg.data = { type: 'text', content: item.data }
      }
      else if (item.type === 'link') {
        msg.data = { type: item.data.subType, content: item.data }
      }
      this.dispatch(BUS_EVENTS.CHAT, msg)
    }
  }

  async getOnlineList(){
    const users = []
    const rs0 = await inavApi.onlineList()
    for (const item of rs0.data) {
      users.push(item)
    }
    this.dispatch(BUS_LOCAL_EVENTS.USER_LIST, users)
  }

  listen(){
    const self = this
    function onFunction(ev) {
      if (!ev) return
      const type = ev.service_type
      const rd = {
        msgId: ev.msg_id || '',
        appId: ev.app_id || '',
        channelId: ev.channel || '',
        sourceId: ev.sender_id || '',
        targetId: '',
        time: Date.now(),
        context: safeParse(ev.context) || {},
        data: safeParse(ev.data) || {},
      }
      rd.context.accountId = rd.sourceId
      const subType = rd.data.type
      switch (type) {
        case 'service_im':
          if (subType === 'disable') {
            rd.data = [rd.data.target_id]
            self.dispatch(BUS_EVENTS.USER_MUTE, rd)
          }
          else if (subType === 'permit') {
            rd.data = [rd.data.target_id]
            self.dispatch(BUS_EVENTS.USER_UNMUTE, rd)
          }
          else if (subType === 'disable_all') {
            self.dispatch(BUS_EVENTS.ROOM_MUTE_ALL, rd)
          }
          else if (subType === 'permit_all') {
            self.dispatch(BUS_EVENTS.ROOM_UNMUTE_ALL, rd)
          }
          // 使用link作为特殊聊天类型
          else if (subType === 'link') {
            const type = rd.data.text_content.subType
            rd.data = rd.data.text_content
            rd.data.type = type
            self.dispatch(BUS_EVENTS.CHAT, rd)
          } else {
            // 聊天消息
            if (rd.data.text_content) rd.data.content = rd.data.text_content
            self.dispatch(BUS_EVENTS.CHAT, rd)
          }
          break
        case 'service_custom':
          // 自定义事件
          self.dispatch('custom', rd)
          break
        case 'service_online':
          // 在线/离线
          if (process.env.NODE_ENV !== 'production') console.log('service_online', rd)
          rd.data.accountId = rd.sourceId
          if (rd.data.type === 'Join') self.dispatch(BUS_EVENTS.USER_JOIN, rd)
          else if (rd.data.type === 'Leave') self.dispatch(BUS_EVENTS.USER_LEFT, rd)
          break
        case 'service_document':
          break
        case 'service_room':
          break
        default:
          console.log('service_default', ev)
      }
    }

    this.chat.onCustomMsg(onFunction)
    this.chat.on(onFunction)
    this.chat.join(onFunction)
    this.chat.leave(onFunction)

    this.chat.onOnLine(() => {
      this.store.state.imOnline = true
    })
    this.chat.onOffLine(() => {
      this.store.state.imOnline = false
    })
    this.store.state.imOnline = true
  }

  listenV4(){
    const events = [
      VhallChat.EVENTS.CHAT,
      VhallChat.EVENTS.JOIN,
      VhallChat.EVENTS.LEFT,
      VhallChat.EVENTS.KICK,
      VhallChat.EVENTS.MUTE,
      VhallChat.EVENTS.UNMUTE,
      VhallChat.EVENTS.MUTE_ALL,
      VhallChat.EVENTS.UNMUTE_ALL,
      VhallChat.EVENTS.OFFLINE,
      VhallChat.EVENTS.ONLINE,
      'custom',
      'document',
      'room'
    ]
    for (const event of events) {
      this.chat.on(event, this.dispatch.bind(this, event))
    }
  }

  dispatch(event, ev){
    if (this._destroy) return
    if (event === 'custom') {
      let toMe = false
      const targetId = ev.data.targetId
      const type = ev.data.type
      if (targetId === SPECIAL_ACCOUNT_ID.EVERYONE) toMe = true
      else if (targetId === SPECIAL_ACCOUNT_ID.MANGLE && (this.identity === IDENTITY.master || this.identity === IDENTITY.helper)) toMe = true
      else if (targetId === SPECIAL_ACCOUNT_ID.MASTER && this.identity === IDENTITY.master) toMe = true
      else if (targetId === this.accountId) toMe = true
      if (process.env.NODE_ENV !== 'production') console.log('custom_msg', type, targetId, ev.data)
      if (!toMe) return
      return this.emit(type, ev)
    }
    this.emit(event, ev)
  }

  destroy(){
    this._destroy = true
    if (this.chat) {
      const msg = this.chat.msg
      this.chat.destroy()
      if (msg) {
        msg.app.msg = null
        msg.disconnect()
      }
    }
  }

  _error(text) {
    if (!text) return
    this.vm && this.vm.$message.error(text)
  }

  _warn(text) {
    if (!text) return
    this.vm && this.vm.$message.warning(text)
  }

  _info(text) {
    if (!text) return
    this.vm && this.vm.$message.info(text)
  }

  // 房间事件
  _dispatchRoomMessage(eventName, event) {
    // switch (eventName) {
    // }
  }

  _dispatchInvaStreamMessage(eventName, event) {
    // switch (eventName) {
    // }
  }

  _dispatchMangleMessage(eventName, event) {
    // switch (eventName) {
    // }
  }

  _dispatchAllMessage() {
  }

  @listenBus(BUS_EVENTS.CHAT)
  _onChat(data) {
    this.store.commit('appendChatToList', data)
  }

  @listenBus(BUS_EVENTS.USER_MUTE)
  _onMute(data) {
    if (data.data.indexOf(this.store.getters.accountId) < 0) return
    this.store.state.imDisable = true
  }

  @listenBus(BUS_EVENTS.USER_UNMUTE)
  _onUnMute(data) {
    if (data.data.indexOf(this.store.getters.accountId) < 0) return
    this.store.state.imDisable = false
  }

  @listenBus(BUS_EVENTS.USER_MUTE)
  _onMuteSet(data) {
    if (!this.store.getters.hasOp) return
    const accounts = Array.isArray(data.data) ? data.data : [data.data]
    for (const account of accounts) {
      this.store.commit('addImBlackUserSet', account)
    }
  }

  @listenBus(BUS_EVENTS.USER_UNMUTE)
  _onUnMuteSet(data) {
    if (!this.store.getters.hasOp) return
    const accounts = Array.isArray(data.data) ? data.data : [data.data]
    for (const account of accounts) {
      this.store.commit('removeImBlackUserSet', account)
    }
  }

  @listenBus(BUS_EVENTS.ROOM_MUTE_ALL)
  _onRoomMute(data) {
    this.store.state.imDisableAll = true
  }

  @listenBus(BUS_EVENTS.ROOM_UNMUTE_ALL)
  _onRoomUnMute(data) {
    this.store.state.imDisableAll = false
  }

  @listenBus(BUS_EVENTS.USER_JOIN)
  _onUserJoin(ev) {
    this.store.state.imOnlineUserTotal += 1
    const user = {
      accountId: ev.data.accountId || ev.sourceId || ev.context.accountId || '',
      nickName: ev.context.nickName || ev.context.nick_name || '',
      avatar: ev.context.avatar,
      identity: ev.context.identity,
    }
    this.store.commit('addImUser', user)
  }

  @listenBus(BUS_EVENTS.USER_LEFT)
  _onUserLeft(ev) {
    if (this.store.state.imOnlineUserTotal <= 1) {
      this.store.dispatch('getOnlineImUserNumber', {})
    }
    this.store.state.imOnlineUserTotal -= 1
    this.store.commit('removeImUser', ev.data.accountId)
  }

  @listenBus(BUS_LOCAL_EVENTS.USER_LIST)
  _onUserList(list) {
    this.store.commit('setImUserList', list)
  }

  @listenBus(BUS_CUSTOM_EVENTS.KICK)
  _onKick() {
    // this._info('您已被主持人/助理踢出房间')
    // TODO
  }

  @listenBus(BUS_CUSTOM_EVENTS.REQUEST)
  _onRequest(ev) {
    const userId = ev.data.sourceId
    this.store.commit('setInvaRequestStat', { userId, stat: true })
    this._info('您收到新的上麦申请')
  }

  @listenBus(BUS_CUSTOM_EVENTS.REQUEST_CALLBACK_REJECT)
  _onRequestCallbackReject(ev) {
    const userId = ev.data.sourceId
    store.commit('setInvaRequestStat', { userId, stat: false })
    return this._error('上麦请求已被拒绝')
  }

  @listenBus(BUS_CUSTOM_EVENTS.REQUEST_CALLBACK_AGREE)
  _onRequestCallbackAgree(ev) {
    // 同意上麦，调用上麦
    // this._info('请求已被同意')
    // 上麦流程
    // this.emit(BUS_LOCAL_EVENTS.INVA_PUBLISH_OP, ev.data)
  }

  @listenBus(BUS_CUSTOM_EVENTS.INVITER)
  _onInviter(ev) {
    // const status = ev.data.status
    // this._info('被邀请上麦')
    // 弹出同意/拒绝窗调用
  }

  @listenBus(BUS_CUSTOM_EVENTS.INVITER_CALLBACK_AGREE)
  _onInviterCallbackAgree(ev) {
    const userId = ev.data.sourceId
    const nickName = ev.data.nickName
    const nickName1 = nickName || '用户'
    this.store.commit('setInvaRequestStat', { userId, stat: false })
    this._info(`${nickName1}同意了邀请`)
  }

  @listenBus(BUS_CUSTOM_EVENTS.INVITER_CALLBACK_REJECT)
  _onInviterCallback(ev) {
    const userId = ev.data.sourceId
    const nickName = ev.data.nickName
    const nickName1 = nickName || '用户'
    this.store.commit('setInvaRequestStat', { userId, stat: false })
    this._warn(`${nickName1}拒绝了上麦邀请`)
  }

  // 关闭麦克风
  @listenBus(BUS_CUSTOM_EVENTS.CLOSE_MIC)
  _onCloseMic(ev) {
    if (this.store.getters.hasOp) return
    this.store.dispatch('closeMic', {})
    console.log('您已被关闭麦克风')
  }

  // 关闭摄像头
  @listenBus(BUS_CUSTOM_EVENTS.CLOSE_CAMERA)
  _onCloseCamera(ev) {
    if (this.store.getters.hasOp) return
    this.store.dispatch('closeCamera', {})
    console.log('您已被关闭摄像头')
  }

  // 开启麦克风
  @listenBus(BUS_CUSTOM_EVENTS.OPEN_MIC)
  _onOpenMic(ev) {
    if (this.store.getters.hasOp) return
    this.store.dispatch('openMic', {})
    console.log('您已被开启麦克风')
  }

  // 开启摄像头
  @listenBus(BUS_CUSTOM_EVENTS.OPEN_CAMERA)
  _onOpenCamera(ev) {
    if (this.store.getters.hasOp) return
    this.store.dispatch('openCamera', {})
    console.log('您已被开启摄像头')
  }

  // 关闭麦克风
  @listenBus(BUS_CUSTOM_EVENTS.CLOSE_MIC_ALL)
  _onCloseMicAll(ev) {
    if (this.store.getters.hasOp) return
    this.store.dispatch('closeMic', {})
    console.log('您已被关闭麦克风')
  }

  // 关闭摄像头
  @listenBus(BUS_CUSTOM_EVENTS.CLOSE_CAMERA_ALL)
  _onCloseCameraAll(ev) {
    if (this.store.getters.hasOp) return
    this.store.dispatch('closeCamera', {})
    console.log('您已被关闭摄像头')
  }

  // 开启麦克风
  @listenBus(BUS_CUSTOM_EVENTS.OPEN_MIC_ALL)
  _onOpenMicAll(ev) {
    if (this.store.getters.hasOp) return
    this.store.dispatch('openMic', {})
    console.log('您已被开启麦克风')
  }

  // 开启摄像头
  @listenBus(BUS_CUSTOM_EVENTS.OPEN_CAMERA_ALL)
  _onOpenCameraAll(ev) {
    if (this.store.getters.hasOp) return
    this.store.dispatch('openCamera', {})
    console.log('您已被开启摄像头')
  }

  @listenBus(BUS_CUSTOM_EVENTS.TIP_TEXT)
  _onTips(ev) {
    const text = ev.data.text
    if (text) this._info(text)
  }

  @listenBus(BUS_CUSTOM_EVENTS.LIVE_START)
  async _onLiveStart(ev) {
    // 旁路时，监听开始旁路为直播开始
    if (!this.store.getters.hasOp) return
    this.store.state.liveStatus = 3
    this.store.state.liveStartAt = ev.data.liveStartAt || Date.now()
  }

  @listenBus(BUS_CUSTOM_EVENTS.LIVE_START_ANOTHER)
  async _onLiveStartAnother(ev) {
    // 旁路时，监听开始旁路为直播开始
    if (this.store.getters.hasOp) return
    await wait(800)
    this.store.state.liveStatus = 3
    this.store.state.liveStartAt = ev.data.liveStartAt || Date.now()
  }

  @listenBus(BUS_CUSTOM_EVENTS.LIVE_STOP)
  _onLiveStop(ev) {
    // this.store.state.liveStatus = 4
  }

  @listenBus(BUS_CUSTOM_EVENTS.RESOURCE_CHANGE)
  _onResourceChange(ev) {
    if (!this.store.getters.hasOp) return
    const resource = ev.data.resource
    const change = ev.data.change
    const data = ev.data.data

    switch (resource) {
      case 'inav':
        // console.log('上麦用户列表更新', change, data)
        break
      case 'kick':
        // console.log('黑名单用户列表更新', change, data)
        break
      case 'doc':
        // console.log('文档列表更新', change, data)
        break
      case 'from':
        // console.log('表单列表更新', change, data)
        break
    }
  }

}
