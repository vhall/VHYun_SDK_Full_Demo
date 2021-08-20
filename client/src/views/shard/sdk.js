
function safeParse (str) {
  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}

// 互动sdk消息监听
export async function rtcListen(rtc, vm){
  const VhallRTC = window.VhallRTC
  const store = vm.$store

  function isMe(userId){
    return store.state.user?.userId === userId
  }

  function hasOp(){
    return store.getters.hasOp
  }

  function getNickNameById(userId){
    const user = store.state.userMap[userId]
    return user?.nickName || userId
  }

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
    store.commit('delRemoteStream', { streamId, userId: accountId, streamType, attributes })
    if (store.getters.livein) return
    if (!hasOp()) return
    if (isMe(accountId)) return
    if (accountId !== store.state.stream.masterUserId) return
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

  // 被添加进用户黑名单事件 （用户被加入黑名单，并踢出）
  rtc.on(VhallRTC.EVENT_ROOM_BLACKLIST, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('被添加进用户黑名单事件', event.data)
    const { userId } = event.data
    if (!isMe(userId)) return
    vm.$message.error('您被踢出互动房间')
    vm.$router.push('/')
  })
  // 强行踢出房间事件 （被踢出）
  rtc.on(VhallRTC.EVENT_ROOM_FORCELEAVE, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('强行踢出房间事件', event.data)
    vm.$message.info('您已在其他窗口打开互动房间，退出互动房间')
    vm.$router.replace('/')
    store.commit('clearRoomData')
  })

  // 房间异常断开事件
  rtc.on(VhallRTC.EVENT_ROOM_EXCDISCONNECTED, () => {
    if (process.env.NODE_ENV !== 'production') console.info('房间异常断开事件')
    vm.$root.$emit('EVENT_ROOM_EXCDISCONNECTED')
    vm.$message.error('房间异常断开')
  })

  // 推拉流异常事件
  rtc.on(VhallRTC.EVENT_REMOTESTREAM_FAILED, (event) => {
    if (process.env.NODE_ENV !== 'production') console.error('推拉流异常事件', event.data)
    const { msg, stream } = event.data
    if (msg === 'Stream fail after connection') vm.$root.$emit('EVENT_ROOM_EXCDISCONNECTED')
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
    const { streamId, stream } = event.data
    const desktopId = store.state.stream.desktop?.streamId
    if (window.streamId === streamId) {
      // 忽略
    } else if (desktopId === streamId) {
      // 删除屏幕共享流
      vm.$message('屏幕共享已关闭')
      store.commit('delLocalStream', streamId)
      return
    } else {
      // vm.$message('本地流断开，请检查设备是否异常断开')
      console.error('本地流断开，请检查设备是否异常断开', event.data)
    }
    // 设备被拔掉尝试关掉直播 (
    store.dispatch('checkLocalStream', { endLive: true, streamId, stream })
    store.commit('delLocalStream', streamId)
  })

  // 检测到新增设备或移除设备
  rtc.on(VhallRTC.EVENT_DEVICE_CHANGE, () => {
    if (process.env.NODE_ENV !== 'production') console.info('检测到设备更改')
    store.dispatch('checkLocalStream', { })
  })

  // region 上下麦
  // 被邀请上麦事件
  rtc.on(VhallRTC.EVENT_ROOM_INVITED, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('被邀请上麦事件', event.data)
  })
  // 邀请上麦回复事件 （仅对于主持人和助理有意义）
  rtc.on(VhallRTC.EVENT_ROOM_CALLBACK, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('邀请上麦回复事件', event.data)
  })
  // 申请上麦事件 （用户申请上麦，仅对于主持人和助理可批准拒绝，token中也是包含权限的）
  rtc.on(VhallRTC.EVENT_ROOM_APPLY, async (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('申请上麦事件', event.data)
  })
  // 审核上麦事件结果 （被同意/拒绝）
  rtc.on(VhallRTC.EVENT_ROOM_AUTH, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('审核上麦事件结果', event.data)
  })
  // endregion 上下麦

  // region 房间事件
  // 用户加入房间事件
  rtc.on(VhallRTC.EVENT_ROOM_JOIN, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('用户加入房间事件', event.data)
  })
  // 用户离开房间事件
  rtc.on(VhallRTC.EVENT_ROOM_LEAVE, (event) => {
    if (process.env.NODE_ENV !== 'production') console.info('用户离开房间事件', event.data)
  })
  // 正常断开房间
  rtc.on(VhallRTC.EVENT_ROOM_DISCONNECTED, () => {
    if (process.env.NODE_ENV !== 'production') console.info('正常断开房间')
  })
  // endregion 房间事件

  return () => null
}

