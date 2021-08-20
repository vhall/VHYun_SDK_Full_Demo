<template>
  <div class="main-small-window-warp">
    <!-- rtc: 观众/嘉宾已上麦 主持人摄像头(远程) -->
    <div v-if="!isVod && type===3" class="main-small-window-warp-item">
      <StreamItemRemote :live-status="liveStatus" :rtc="rtc" :stream="stream" :user="user" :hasOp="false"/>
      <div class="control out-ctr" v-show="livein && !sm2">
        <div class="control-wrap">
          <div title="切换大屏" class="control-item" @click="changeSM">
            <i class="el-icon el-icon-copy-document" style="margin: 6px 8px;" />
          </div>
        </div>
      </div>
    </div>

    <!-- 旁路 -->
    <div v-else-if="!isVod && type===4" class="main-small-window-warp-item">
      <PlayerItem :option="playerOption" :is-live="livein"/>
      <div class="control out-ctr" v-show="livein && !sm2">
        <div class="control-wrap">
          <div title="切换大屏" class="control-item" @click="changeSM">
            <i class="el-icon el-icon-copy-document" style="margin: 6px 8px;" />
          </div>
        </div>
      </div>
    </div>

    <!-- 录播 -->
    <div v-else-if="isVod" class="main-small-window-warp-item">
      <VodPlayerItem :option="playerOption" :sendBarrage="sendBarrage" :fullFunction="$store.state.smChange" ref="player"/>
      <div class="control out-ctr" v-show="livein && !sm2">
        <div class="control-wrap">
          <div title="切换大屏" class="control-item" @click="changeSM">
            <i class="el-icon el-icon-copy-document" style="margin: 6px 8px;" />
          </div>
        </div>
      </div>
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
import StreamItemRemote from '@/components/Stream/StreamItemRemote'
import PlayerItem from '@/components/Stream/PlayerItem'
import VodPlayerItem from '@/components/Stream/VodPlayerItem'
import {BUS_LOCAL_EVENTS} from '@/common/contant'

export default {
  name: 'MainSmallWindow',
  components: {StreamItemRemote, PlayerItem, VodPlayerItem},
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
      this.$store.dispatch('muteInavAll', {mute})
    },
    addBarrage(chat) {
      const content = chat && chat.data && chat.data.content
      const type = chat && chat.data && chat.data.type
      if (type !== 'text') return
      if (!(this.$refs.player && this.$refs.player.$emit)) return
      this.$refs.player.$emit('barrage', {content})
    },
    sendBarrage(content) {
      content = (content || '').trim()
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
    hasAllBtn() {
      return this.$store.state.stream.remote.length
    },
    // 旁路 OR 录播播放选项
    playerOption() {
      // 视频文档需要等文档先初始化
      if (!this.docSuccess) return null
      if (!this.livein) return null
      const option = this.$store.getters.getSdkOption
      if (!(option && option.token)) return null
      return option
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

      // 观众/嘉宾已上麦
      if (this.$store.getters.hasMeStreamPublish) return 3
      // 观众/嘉宾 旁路
      return 4
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
    //position: absolute;
    //width: 100%;
    //height: 100%;
    top: 0;
    left: 0;
    //background-color: rgba(0, 0, 0, 0.4);
    //display: none;
    z-index: 199;

    .control-wrap {
      //margin: auto;
      //display: flex;
      //flex-wrap: wrap;
      //max-width: 98px;
      //height: 100%;
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 199;
      .control-item {
        cursor: pointer;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 100%;
        line-height: 32px;
        margin: auto;
      }
    }
  }

}

.main-small-window-warp-item:hover .out-ctr {
  display: block;
  z-index: 101;
}

.main-small-window-warp-item {
  width: 100%;
  height: 100%;
  background: black;
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
