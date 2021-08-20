<template>
  <div
    class="stream-item"
    data-component="StreamItemLocalMaster"
    ref="streamItem"
    @mouseenter="controlShow = true"
    @mouseleave="controlShow = false"
    :data-identity="user && user.identity"
    :data-userId="user && user.userId"
    :data-status="stream && stream.status"
    :id="viewStreamId"
  >
    <!-- notStream -->
    <div class="notStream" v-show="notStream">
      <img src="../images/video-blank@2x.png" alt=""/>
      <div>{{ liveStatus === 4 ? '直播已结束' : '直播暂未开始' }}</div>
    </div>
    <!-- noVideo -->
    <div class="noVideo" v-show="noVideo">
      <img src="../images/icon-video-close@2x.png" alt="">
    </div>
    <!-- moreInfo -->
    <div class="more-info" v-show="!smShow" v-if="viewStreamId">
      <div class="nickName">
        <i class="iconfont" :class="micStatusClass"/> &nbsp;
        <span :title="nickName">{{ stringCut(nickName, 16) }}</span>
      </div>
    </div>
    <!-- DEBUG 信息 -->
    <div class="debug" style="position: absolute;pointer-events: none;display: none;" v-if="showDebug && viewStreamId">
      id: <span class="value">{{ viewStreamId }}</span>
      <br/>
      video: <span class="value">{{ stream && stream.video }}</span
    >, audio: <span class="value">{{ stream && stream.audio }}</span>
      <br/>
      role: <span class="value">{{ user && user.identity }}</span>
      <br/>
      userId: <span class="value">{{ ((user && user.userId) || '') }}</span>
    </div>
    <!-- 控制 -->
    <div class="control" v-show="viewStreamId && controlShow && !smShow">
      <!-- 流控制操作，控制自己 -->
      <div class="control-wrap">
        <!-- 本地 -->
        <div class="control-wrap-item">
          <span class="title">本地</span>
          <!-- 静音 -->
          <div title="静音" class="control-item" @click="muteAudio"><i class="iconfont" :class="oPMicStatusClass"/></div>
          <!-- 关闭摄像头 -->
          <div title="关闭摄像头" class="control-item" @click="muteVideo"><i class="iconfont" :class="oPVideoStatusClass"/></div>
        </div>
        <!-- 学员 -->
        <div class="control-wrap-item" v-show="liveStatus===3 && hasMemberBtn">
          <span class="title">互动</span>
          <!-- 全体下麦 -->
          <div title="全体下麦" class="control-item" @click="downInavAll">
            <img src="../../assets/images/icons/o-online@2x.png" alt="" style="width: 20px; height: 20px; margin: 6px;">
            <!-- <i class="el-icon el-icon-switch-button" style="margin: 6px 7px;" /> -->
          </div>
          <!-- 全体静音 -->
          <div :title="isMuteInavAll ? '取消全体静音' : '全体静音'" class="control-item" @click="muteInavAll">
            <img src="../../assets/images/icons/off-mic@2x.png" alt="" v-show="isMuteInavAll" style="width: 20px; height: 20px; margin: 6px;">
            <img src="../../assets/images/icons/on-mic@2x.png" alt="" v-show="!isMuteInavAll" style="width: 20px; height: 20px; margin: 6px;">
            <!-- <i class="el-icon" :class="!isMuteInavAll ? 'el-icon-close-notification' : 'el-icon-microphone'" style="color: white;font-size: 18px;margin: 6px 8px;" /> -->
          </div>
          <!-- 关闭摄像头 -->
          <div :title="isMuteInavCarmeAll ? '开启所有摄像头' : '关闭所有摄像头'" class="control-item" @click="muteInavCarmeAll">
            <img src="../../assets/images/icons/off-all-camera@2x.png" alt="" v-show="isMuteInavCarmeAll" style="width: 18px; height: 18px; margin: 7px;">
            <img src="../../assets/images/icons/on-all-camera@2x.png" alt="" v-show="!isMuteInavCarmeAll" style="width: 18px; height: 18px; margin: 7px;">
            <!-- <i class="icon iconfont" :class="!isMuteInavCarmeAll ? 'iconicon-zhuchirenqushexiangtouguanbi' : 'iconicon-zhuchirenqushexiangtoukaiqi'" style="color: white;" /> -->
          </div>
        </div>
        <!-- 切屏 -->
        <div class="control-wrap-item" v-show="liveStatus">
          <span class="title">切屏</span>
          <div title="切屏" class="control-item" @click="swScreen">
            <i class="el-icon el-icon-copy-document" style="margin: 6px 7px;" />
          </div>
          <div title="全屏" class="control-item" @click="fullScreenItem">
            <i class="el-icon el-icon-full-screen" style="margin: 6px 7px;" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {videoAutoPlay, videoAutoPlaySupport} from '@/utils/autoplay'
import {IDENTITY, promisify, stringCut} from '@/utils'

export default {
  name: 'StreamItemLocalMaster',
  components: {},
  props: {
    videoNode: String,
    stream: Object,
    user: Object,
    rtc: Object,
    liveStatus: Number,
    isOp: Boolean,
    hasMemberBtn: Number,
    smShow: Boolean,
    isMuteInavAll: Boolean,
    isMuteInavCarmeAll: Boolean,
  },
  data: () => ({
    showDebug: process.env.NODE_ENV === 'development',
    controlShow: false,
    audioLevel: 0,
    tick: false,
    play: false,
    // isMuteInavAll: false,
    // isMuteInavCarmeAll: false,
    stringCut,
  }),
  mounted() {
    // this.startTick()
    this.videoPlay()
  },
  computed: {
    viewStreamId() {
      return this.stream?.streamId
    },
    notStream() {
      if (!this.rtc) return true
      if (!this.viewStreamId) return true
      return false
    },
    noVideo() {
      return !this.notStream && !this.stream?.video
    },
    // 麦克风状态
    micStatusClass() {
      const stream = this.stream || {}
      const cls = []
      if (!this.viewStreamId) return cls
      // 见文档
      // 当流不包含音频或禁止音频轨道时，返回值为0。
      // 支持本地流，表示当前采集的音量。
      // 支持远端流，表示当前播放的音量。
      // 该音量值是在内部定时每一秒更新一次，因此不是完全实时的。
      // 由于此数值跟物理音量并非线性关系，建议设计为： 共5格，
      // 1格：数值0-0.04
      // 2格：数值0.04-0.16
      // 3格：数值0.16-0.36
      // 4格：数值0.36-0.64
      // 5格：数值0.64-1
      const levelOn = this.audioLevel > 0.12
      if (!stream?.audio) {
        cls.push('iconicon-maikefengguanbi')
      } else {
        if (levelOn) {
          cls.push('active')
          cls.push('iconicon-maikefengfayanzhong')
        } else {
          cls.push('iconicon-maikefengmoren')
        }
        cls.push('iconicon-maikefengguanbi')
      }
      return cls
    },
    // 麦克风状态
    oPMicStatusClass() {
      const stream = this.stream || {}
      const cls = []
      if (!this.viewStreamId) return cls
      cls.push(stream?.audio ? 'iconicon-zhuchirenqumaikefengkaiqi' : 'iconicon-zhuchirenqumaikefengguanbi')
      return cls
    },
    // 操作区视频状态
    oPVideoStatusClass() {
      const stream = this.stream || {}
      const cls = []
      if (!this.viewStreamId) return {}
      cls.push(stream?.video ? 'iconicon-zhuchirenqushexiangtoukaiqi' : 'iconicon-zhuchirenqushexiangtouguanbi')
      return cls
    },
    // 用户名
    nickName() {
      return this.user?.nickName || this.user?.userId
    },
    hasOp() {
      const identity = this.user.identity || this?.$store?.state?.user?.identity
      return identity === IDENTITY.helper || identity === IDENTITY.master
    },
  },
  watch: {
    async tick() {
      const rtc = this.rtc
      if (!rtc) return
      const streamId = this.viewStreamId
      if (!streamId) return
      const level = await promisify(rtc, rtc.getAudioLevel, true)({streamId})
      if (level instanceof Error) {
        this.audioLevel = 0
        return
      }
      this.audioLevel = level
    },
    rtc() {
      this.videoPlay()
    },
    async stream(curr, prev) {
      const cid = curr?.streamId
      const pid = prev?.streamId
      if (pid && !cid) await this.videoStop(pid)
      if (pid && cid && pid !== cid) await this.videoStop(pid)
      await this.$nextTick()
      if (cid) await this.videoPlay(cid)
    },
  },
  methods: {
    downInavAll() {
      this.$emit('downInavAll')
    },
    muteInavAll() {
      this.$emit('muteInavAll', !this.isMuteInavAll)
      // this.isMuteInavAll = !this.isMuteInavAll
    },
    muteInavCarmeAll() {
      this.$emit('muteInavCarmeAll', !this.isMuteInavCarmeAll)
      // this.isMuteInavCarmeAll = !this.isMuteInavCarmeAll
    },
    swScreen() {
      this.$emit('swScreen')
      // this.$store.state.smChange = true
    },
    fullScreenItem() {
      if (!this.$refs.streamItem) return
      const el = this.$refs.streamItem.getElementsByTagName('video')[0]
      if (!(el && el.requestFullscreen)) return
      el.requestFullscreen()
    },
    startTick() {
      const tickId = setInterval(() => {
        this.tick = !this.tick
      }, 300)
      // 取消滴答函数
      this.$once('hook:beforeDestroy', () => clearInterval(tickId))
    },
    async videoPlay($streamId) {
      if (!this.rtc) return
      const streamId = $streamId || this.viewStreamId
      const videoNode = this.viewStreamId
      if (!streamId) return
      if (!await this.hasStream(streamId)) return console.info('videoPlay: stream is gone: ' + streamId)
      if (this.play) return
      this.play = true

      try {
        await this.rtc.playStream({streamId, videoNode})
      } catch (e) {
        this.play = false
        console.error('StreamItem videoPlay error', e)
      }

      if (!await videoAutoPlaySupport()) {
        // 解决刷新后不自动播放的问题
        const wrap = window.document.getElementById(videoNode)
        if (!wrap) return
        const v = wrap.getElementsByTagName('video')[0]
        if (!v) return
        await videoAutoPlay(v, false).catch(() => null)
      }
    },
    async videoStop($streamId) {
      if (!this.rtc) return
      const streamId = $streamId || this.stream?.streamId
      if (!streamId) return
      if (!this.play) return
      this.play = false
      if (!await this.hasStream(streamId)) return console.info('videoStop: stream is gone: ' + streamId)

      try {
        // 流不存在说明已经被删除，不用理会了
        await this.rtc.stopStream({streamId}).catch((e) => (e.code === '611006' ? null : Promise.reject(e)))
      } catch (e) {
        console.error('StreamItem videoStop error', e)
      }
    },
    async muteAudio() {
      if (!this.rtc) return
      const streamId = this.viewStreamId
      const isMute = this.stream?.audio
      await promisify(this.rtc, this.rtc.muteAudio)({streamId, isMute})
      if (this.$store) this.$store.commit('setRemoteStreamAVStatus', {
        streamId,
        muteStream: {audio: isMute, video: !this.stream?.video}
      })
    },
    async muteVideo() {
      if (!this.rtc) return
      const streamId = this.viewStreamId
      const isMute = this.stream?.video
      await promisify(this.rtc, this.rtc.muteVideo)({streamId, isMute})
      if (this.$store) this.$store.commit('setRemoteStreamAVStatus', {
        streamId,
        muteStream: {audio: !this.stream?.audio, video: isMute}
      })
    },
    async hasStream(streamId) {
      if (!streamId) return
      if (!this.rtc) return
      const streams = this.rtc.getLocalStreams()
      return !!streams[streamId]
    }
  },
  beforeDestroy() {
    this.videoStop()
  },
}
</script>

<style lang="less" scoped>
.stream-item {
  position: relative;
  height: 100%;
  background-color: #111111;
  //border-left: gray 1px solid;
  //border-right: gray 1px solid;
  .debug {
    color: red;
    overflow: hidden;
    max-width: 100%;
    max-height: 100%;
    .value {
      font-weight: 600;
      color: blue;
    }
  }

  .more-info {
    background-image: linear-gradient(180deg, rgba(0, 0, 0, 0) 17%, rgba(0, 0, 0, 0.85) 100%);
    width: 100%;
    height: 27.5%;
    bottom: 0;
    color: #f7f7f7;
    font-size: 12px;

    .iconfont.active {
      color: #1e90ff;
    }
  }

  .nickName {
    position: absolute;
    bottom: 4px;
    left: 8px;
  }

  .control {
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;

    .control-wrap {
      margin: auto;
      display: flex;
      flex-wrap: wrap;
      max-width: 180px;
      .control-wrap-item {
        display: block;
        height: 32px;
        margin: 8px 0;
        .title {
          line-height: 32px;
          vertical-align: top;
          display: inline-block;
          height: 32px;
          margin-right: 8px;
        }
      }
    }

    .control-item:hover {
      background-color: #1e90ff;
    }

    .control-item {
      width: 32px;
      height: 32px;
      background-color: rgb(0, 0, 0, 0.6);
      color: rgba(0, 0, 0, 0.7);
      border-radius: 100%;
      line-height: 32px;
      margin: 0 6px;;
      cursor: pointer;
      display: inline-block;
      vertical-align: top;

      .el-icon {
        color: white;
        font-size: 18px;
        vertical-align: top;
      }

      .iconfont {
        font-size: 32px;
        color: white;
        line-height: 32px;
        vertical-align: top;
      }
    }
  }

  .notStream {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    color: #666;

    img {
      width: 70px;
      height: 70px;
      margin-bottom: 6px;
    }
  }

  .noVideo {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    background-color: #0f0f0f;
    width: 100%;
    height: 100%;
    color: #666;

    img {
      width: 70px;
      height: 70px;
      margin-bottom: 6px;
    }
  }

  .control {
    position: absolute;
    z-index: 88;
  }

  .debug {
    position: absolute;
    z-index: 77;
  }

  .more-info {
    position: absolute;
    z-index: 66;
  }

  .noVideo {
    position: absolute;
    z-index: 20;
  }

  .notStream {
    position: absolute;
    z-index: 12;
  }

  /deep/ .licode_player {
    //position: absolute;
    z-index: 50;
    background-color: transparent !important;
  }

  /deep/ .licode_player video {
    object-fit: contain;
  }
}

.iconicon-maikefengmoren, .iconicon-maikefengguanbi {
  font-size: 12px;
}

.home-content.sm2 /deep/ .licode_player video {
  object-fit: contain;
}
</style>
