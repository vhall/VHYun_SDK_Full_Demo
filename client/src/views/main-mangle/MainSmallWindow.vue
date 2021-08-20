<template>
  <div class="main-small-window-warp">

    <!-- rtc: 主持人 主持人摄像头(本地) -->
    <div v-if="!isVod && type===1" class="main-small-window-warp-item">
      <StreamItemLocalMaster
        @downInavAll="downInavAll"
        @muteInavAll="muteInavAll"
        @muteInavCarmeAll="muteInavCarmeAll"
        @swScreen="swScreen"
        :smShow="$store.state.smChange"
        :hasMemberBtn="hasMemberBtn"
        :live-status="liveStatus"
        :isMuteInavAll="isMuteInavMicAll"
        :isMuteInavCarmeAll="isMuteInavCarmeAll"
        :rtc="rtc"
        :stream="stream"
        :user="user"/>
    </div>

    <!-- rtc: 助理 主持人摄像头(远程) -->
    <div v-else-if="!isVod && type===2" class="main-small-window-warp-item">
      <StreamItemRemoteHelper
        @downInavAll="downInavAll"
        @muteInavAll="muteInavAll"
        @muteInavCarmeAll="muteInavCarmeAll"
        @swScreen="swScreen"
        :smShow="$store.state.smChange"
        :hasMemberBtn="hasMemberBtn"
        :isMuteInavAll="isMuteInavMicAll"
        :isMuteInavCarmeAll="isMuteInavCarmeAll"
        :live-status="liveStatus"
        :rtc="rtc"
        :stream="stream"
        :user="user"
        />
    </div>

    <!-- zz: blank -->
    <div v-else class="main-small-window-warp-item">
      <div class="player-box">
        <div class="default">
          <img src="../../assets/images/video-blank@2x.png" alt="">
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import StreamItemLocalMaster from '@/components/Stream/StreamItemLocalMaster'
import StreamItemRemoteHelper from '@/components/Stream/StreamItemRemoteHelper'
import {BUS_LOCAL_EVENTS} from '@/common/contant'

export default {
  name: 'MainSmallWindow',
  components: {StreamItemLocalMaster, StreamItemRemoteHelper},
  data() {
    return {
      docSuccess: false,
    }
  },
  methods: {
    downInavAll() {
      this.$store.dispatch('downInavAll')
    },
    muteInavAll(mute) {
      this.$store.dispatch('inavCtrDevice', {device: 'mic', userId: '', close: mute})
      // this.$store.dispatch('muteInavAll', {mute})
    },
    muteInavCarmeAll(mute) {
      this.$store.dispatch('inavCtrDevice', {device: 'camera', userId: '', close: mute})
    },
    swScreen(mute) {
      this.$store.state.smChange = true
    },
    addBarrage(chat) {
      const content = chat && chat.data && chat.data.content
      const type = chat && chat.data && chat.data.type
      if (type !== 'text') return
      if (!(this.$refs.player && this.$refs.player.$emit)) return
      this.$refs.player.$emit('barrage', {content})
    },
    sendBarrage(content) {
      if (!content) return
      if (this.chat) {
        this.$store.dispatch('emitTextChat', content)
      } else {
        if (!(this.$refs.player && this.$refs.player.$emit)) return
        this.$refs.player.$emit('barrage', {content})
      }
    },
    vodTurnTime(data) {
      const time = data && data.createTime
      if (typeof time !== 'number') return
      if (!(this.$refs.player && this.$refs.player.$emit)) return
      this.$refs.player.$emit('vodTurnTime', {time})
    },
    changeSM() {
      this.$store.state.smChange = !this.$store.state.smChange
    },
  },
  created() {
    this.docSuccess = !!(this.$store.getters.livein && this.$store.getters.chat)
    this.$root.$once('startInitDoc', async () => {
      this.docSuccess = true
    })
    this.$root.$on(BUS_LOCAL_EVENTS.INVA_CHAT, this.addBarrage.bind(this))
    this.$root.$on(BUS_LOCAL_EVENTS.VOD_TURN_TIME, this.vodTurnTime.bind(this))
  },
  mounted() {
  },
  computed: {
    hasMemberBtn() {
      if (this.isMaster) return this.$store.state.stream.remote.length
      const masterId = this.$store.state.stream.masterLocal && this.$store.state.stream.masterLocal.userId
      const streams = this.$store.state.stream.remote.filter(i => i.userId !== masterId)
      return streams.length
    },
    livein() {
      return this.$store.getters.livein
    },
    liveStatus() {
      return this.$store.state.liveStatus
    },
    sm2() {
      return this.$store.state.smChange
    },
    isVod() {
      return this.$store.getters.isVod
    },
    isMaster() {
      return this.$store.getters.isMaster
    },
    isPlayer() {
      return this.$store.getters.isPlayer
    },
    rtc() {
      return this.$store.getters.rtc
    },
    chat() {
      return this.$store.getters.chat
    },
    type() {
      // 小窗：文档和桌面共享
      // if (this.$store.state.smChange) return 4

      // 主持人
      if (this.isMaster) return 1
      // 助理
      return 2
    },
    stream() {
      // 主持人需要使用本地摄像头
      if (this.isMaster) return this.$store.state.stream.local
      return this.$store.state.stream.masterLocal
    },
    user() {
      // 主持人需要使用本地摄像头
      if (this.isMaster) return this.$store.state.user
      const masterUserId = this.$store.state.stream.masterUserId
      return this.$store.state.userMap[masterUserId]
    },
    // 播放本地/远程流
    userLocal() {
      return this.isMaster
    },
    isMuteInavMicAll() {
      const masterId = this.$store.state.stream.masterLocal && this.$store.state.stream.masterLocal.userId
      const streams = this.isMaster ? this.$store.state.stream.remote : this.$store.state.stream.remote.filter(i => i.userId !== masterId)
      return !streams.some(s => s.audio)
    },
    isMuteInavCarmeAll() {
      const masterId = this.$store.state.stream.masterLocal && this.$store.state.stream.masterLocal.userId
      const streams = this.isMaster ? this.$store.state.stream.remote : this.$store.state.stream.remote.filter(i => i.userId !== masterId)
      return !streams.some(s => s.video)
    }
  },
}
</script>

<style lang="css">
.sm2 .main-small-window-warp {
  height: 100% !important;
}
</style>

<style lang="less" scoped>
.main-small-window-warp {
  width: 100%;
  height: 170px;
  position: relative;

  .out-ctr {
    position: absolute;
    display: none;
    right: 10px;
    top: 4px;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 2px;
    color: white;
  }

}

.main-small-window-warp-item:hover .out-ctr {
  display: block;
  z-index: 101;
}

.main-small-window-warp-item {
  width: 100%;
  height: 100%;
}

.player-box {
  position: relative;
  height: 100%;

  .default {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    z-index: 99;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
      width: 70px;
      height: 70px;
    }
  }
}
</style>
