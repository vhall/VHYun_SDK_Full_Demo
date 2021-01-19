import store from '@/store'
import { safeParse } from '@hapi/bourne'
import { IDENTITY } from '@/utils'

if (process.env.NODE_ENV !== 'production') {
  window.store = store
}

export function isMe(userId){
  return store.state.user?.userId === userId
}

export function hasOp(){
  return store.state.user.identity === IDENTITY.helper || store.state.user.identity === IDENTITY.master
}

export function isMaster(){
  return store.state.user.identity === IDENTITY.master
}

export function isPlayer(){
  return store.state.user.identity === IDENTITY.player
}

export function getNickNameById(userId){
  const user = store.state.userMap[userId]
  return user?.nickName || userId
}

// 互动sdk消息监听
export function rtcListenPre(rtc, vm){
  const VhallRTC = window.VhallRTC

  // region 流事件
  // 远端流添加事件
  rtc.on(VhallRTC.EVENT_REMOTESTREAM_ADD, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('远端流添加事件', event.data)
    const { streamId, accountId, streamType } = event.data
    // streamType 流类型 0：纯音频， 1：单视频， 2：音视频， 3：桌面采集
    // attributes 用户自定义参数，创建流时传入（string）。我们这里定义成一个json，方便序列化数据
    const attributes = safeParse(event.data.attributes)
    store.commit('addRemoteStream', { streamId, userId: accountId, streamType, attributes })
  })
  // 远端流删除事件
  rtc.on(VhallRTC.EVENT_REMOTESTREAM_REMOVED, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('远端流删除事件', event.data)
    const { streamId, accountId, streamType } = event.data
    const attributes = safeParse(event.data.attributes)
    if (store.state.live && !isMe(accountId) && hasOp() && accountId !== store.state.stream.masterUserId) {
      vm.$message(`${getNickNameById(accountId)}已下麦`)
    }
    store.commit('delRemoteStream', { streamId, userId: accountId, streamType, attributes })
  })
  // 远端流音视频状态改变事件 (音视频状态改变)
  rtc.on(VhallRTC.EVENT_REMOTESTREAM_MUTE, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('远端流音视频状态改变事件', event.data)
    const { streamId, muteStream } = event.data
    // muteStream: { audio: true, video: true }
    rtc.getAttributes({ streamId }, function (attr) {
      const attributes = safeParse(attr) || {}
      store.commit('setRemoteStreamAVStatus', { streamId, muteStream, attributes })
    }, function () {
      store.commit('setRemoteStreamAVStatus', { streamId, muteStream })
    })
  })
  // endregion 流事件

  // region 房间事件
  // 用户加入房间事件
  rtc.on(VhallRTC.EVENT_ROOM_JOIN, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('用户加入房间事件', event.data)
    const { userId, attributes } = event.data
    const user = safeParse(attributes) || {}
    user.userId = userId
    store.commit('addInvaUser', user)
  })
  // 用户离开房间事件
  rtc.on(VhallRTC.EVENT_ROOM_LEAVE, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('用户离开房间事件', event.data)
    const { userId } = event.data
    store.commit('removeInvaUser', userId)
  })
  // 正常断开房间
  rtc.on(VhallRTC.EVENT_ROOM_DISCONNECTED, () => {
    if (process.env.NODE_ENV !== 'production') console.info('正常断开房间')
    console.log('正常断开房间')
  })
  // endregion 房间事件

  // 被添加进用户黑名单事件 （用户被加入黑名单，并踢出）
  rtc.on(VhallRTC.EVENT_ROOM_BLACKLIST, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('被添加进用户黑名单事件', event.data)
    const { userId } = event.data
    if (!isMe(userId)) {
      // 观看端不需要记录黑名单用户
      if (hasOp()) store.commit('addInvaBlackUserSet', {userId})
    } else {
      vm.$message.error('您被踢出互动房间')
      vm.$router.push('/')
    }
  })
  // 强行踢出房间事件 （被踢出）
  rtc.on(VhallRTC.EVENT_ROOM_FORCELEAVE, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('强行踢出房间事件', event.data)
    const { userId } = event.data
    vm.$message.info('您已在其他窗口打开互动房间，退出互动房间')
    vm.$router.replace('/')
    store.commit('clearRoomData')
  })

  // 房间异常断开事件
  rtc.on(VhallRTC.EVENT_ROOM_EXCDISCONNECTED, () => {
    if (process.env.NODE_ENV !== 'production') console.info('房间异常断开事件')
    vm.$message.error('房间异常断开')
  })
  return () => null
}

// 监听im事件
export function imListenPre (chat, vm) {
  // 用户加入聊天
  chat.join(function ({ sender_id, context, uv }) {
    if (process.env.NODE_ENV !== 'production') console.info('用户加入聊天', sender_id)
    const user = safeParse(context)
    store.commit('addImUser', Object.assign({ }, user, { userId: sender_id }))
    store.commit('setImOnlineUserTotal', uv)
  })
  // 用户离开聊天
  chat.leave(function ({ sender_id, context, uv }) {
    if (process.env.NODE_ENV !== 'production') console.info('用户离开聊天', sender_id)
    store.commit('removeImUser', sender_id)
    store.commit('setImOnlineUserTotal', uv)
  })

  let onCustomMsg = (event) => {
    const userId = event.sender_id
    const context = safeParse(event.context)
    const data = safeParse(event.data)
    if (!data) return
    if (process.env.NODE_ENV !== 'production') console.info('自定义消息事件', userId, data)
    const { type } = data
    switch (type) {
      case 'request_inva':
        if (!hasOp()) break
        vm.$message(`您收到新的上麦申请`)
        store.commit('setInvaRequestStat', { userId: data.targetId, stat: true })
        break
      case 'request_auth':
        console.log('观众请求上麦')
        break
      case 'kick_inav':
        if (hasOp()) {
          store.commit('addInvaBlackUserSet', {userId: data.targetId})
          break
        }
        if (!isMe(data.targetId)) break
        vm.$message.error('您被踢出互动房间')
        vm.$router.push('/')
        break
      case 'unkick_inav':
        if (!hasOp()) break
        store.commit('removeInvaBlackUserSet', data.targetId)
        break
      case 'live_start':
        if (isMaster()) break
        store.commit('setStartLiveStat', { time: data.time })
        break
      case 'live_stop':
        if (isMaster()) break
        // 结束直播了自动下麦，停止共享
        store.dispatch('unpublish', { type: 'local' })
        store.dispatch('unpublish', { type: 'desktop' })
        if (store.state.live) vm.$message('直播已结束')
        store.commit('setStopLiveStat')
        break

      case 'live_start_another_at':
        if (!isPlayer()) break
        console.log('live_start_another_at')
        break
      case 'live_stop_another_at':
        if (!isPlayer()) break
        console.log('live_stop_another_at')
        break

      case 'inva_stream_down':
        if (hasOp()) break
        if (!isMe(data.targetId)) break
        vm.$message(`您已被下麦`)
        store.dispatch('unpublish')
        break
    }
  }
  // 自定义消息
  chat.onCustomMsg(onCustomMsg)

  // 取消监听
  return () => {
    onCustomMsg = Function.prototype
  }
}

// 互动sdk消息监听
export async function rtcListen(rtc, vm){
  const VhallRTC = window.VhallRTC

  // region 上下麦
  // 被邀请上麦事件
  rtc.on(VhallRTC.EVENT_ROOM_INVITED, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('被邀请上麦事件', event.data)
    const { userId, sendId } = event.data
    if (isMe(userId)) {
      // 同意/拒绝窗调用
      vm.invaInviteConfirmation()
      // 同意请求
      // await new Promise((resolve, reject) => rtc.consentInvite({}, resolve, reject))
      // 拒绝上麦
      // await new Promise((resolve, reject) => rtc.rejectInvite({}, resolve, reject))
    }
  })
  // 邀请上麦回复事件 （仅对于主持人和助理有意义）
  if (hasOp()) rtc.on(VhallRTC.EVENT_ROOM_CALLBACK, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('邀请上麦回复事件', event.data)
    const { userId, status } = event.data
    if (isMe(userId)) return
    // 刷新请求上麦列表
    store.commit('saveInvaRequest')
    switch (parseInt(status)) {
      case 1:
        vm.$message.info(`${getNickNameById(userId)}同意邀请上麦`)
        store.commit('setInvaRequestStat', { userId, stat: false })
        break
      case 2:
        // vm.$message(`${getNickNameById(userId)}已下麦`)
        store.commit('setInvaRequestStat', { userId, stat: false })
        break
      case 3:
        vm.$message.error(`${getNickNameById(userId)}拒绝邀请上麦`)
        store.commit('setInvaRequestStat', { userId, stat: false })
        break
    }
  })

  // 申请上麦事件 （用户申请上麦，仅对于主持人和助理可批准拒绝，token中也是包含权限的）
  if (hasOp()) rtc.on(VhallRTC.EVENT_ROOM_APPLY, async (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('申请上麦事件', event.data)
    const { userId } = event.data
    if (isMe(userId)) return
    vm.$message(`您收到新的上麦申请`)
    store.commit('setInvaRequestStat', { userId, stat: true })
  })
  // 审核上麦事件结果 （被同意/拒绝）
  rtc.on(VhallRTC.EVENT_ROOM_AUTH, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('审核上麦事件结果', event.data)
    const { userId, status } = event.data
    store.commit('setInvaRequestStat', { userId, stat: false })
    if (!isMe(userId)) return
    if (status === '2') {
      vm.$message.error('请求已被拒绝')
      return
    }
    // 同意上麦，调用上麦
    if (status === '1') {
      vm.$message('请求已被同意')
      // 上麦流程
      vm.$emit('invaPublish', { type: 'request', autoPublish: true })
    }
  })
  // endregion 上下麦

  // 推拉流异常事件
  rtc.on(VhallRTC.EVENT_REMOTESTREAM_FAILED, (event) => {
    if (process.env.NODE_ENV !== 'production') console.error('推拉流异常事件', event.data)
    const { msg, stream } = event.data
    console.error('推拉流异常', event.data)
    vm.$message.error('推拉流异常')
  })
  // 视频编码异常事件
  rtc.on(VhallRTC.EVENT_STREAM_STUNK, (event) => {
    if (process.env.NODE_ENV !== 'production') console.error('视频编码异常事件', event.data)
    const { streamId } = event.data
    console.error('视频编码异常事件', event.data)
    vm.$message.error('视频编码异常事件')
  })
  // 本地流断开事件 (如：设备被拔掉)
  rtc.on(VhallRTC.EVENT_STREAM_END, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('本地流断开事件', event.data)
    const { streamId } = event.data
    const desktopId = store.state.stream.desktop?.streamId
    if (window.streamId === streamId) {
      // 忽略
    } else if (desktopId === streamId) {
      // 删除屏幕共享流
      vm.$message('屏幕共享已关闭')
      store.commit('delLocalStream', streamId)
      return
    } else {
      vm.$message('本地流断开，请检查设备是否异常断开')
      console.error('本地流断开，请检查设备是否异常断开', event.data)
    }
    // 设备被拔掉尝试关掉直播 (
    store.dispatch('checkLocalStream', { endLive: true, streamId })
    store.commit('delLocalStream', streamId)
  })

  // 检测到新增设备或移除设备
  rtc.on(VhallRTC.EVENT_DEVICE_CHANGE, () => {
    if (process.env.NODE_ENV !== 'production') console.info('检测到设备更改')
    console.log('检测到设备更改')
    store.dispatch('checkLocalStream', { })
  })

  return () => null
}
