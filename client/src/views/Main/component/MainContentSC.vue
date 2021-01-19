<template>
  <div class="MainContentSC">
    <div class="share hide" v-show="!desktopStreamId">
      <div class="text">
        点击侧栏开始共享桌面
      </div>
    </div>
    <div class="share play" :id="desktopStreamId" v-show="desktopStreamId">
    </div>
  </div>
</template>

<script>
import {IDENTITY} from "@/utils"

export default {
  name: 'MainContentSC',
  components: { },
  data: () => ({
    play: false,
  }),
  mounted() {
    if (this.desktopStreamId) {
      this.mute()
      this.playMasterDesktop()
    }
  },
  watch: {
    rtc(v) {
      if (!v) return
      this.mute()
      this.playMasterDesktop()
    },
    async desktopStreamId(curr, prev) {
      if (curr === prev) return
      if (prev) this.stopMasterDesktop(prev)
      if (curr) {
        await this.$nextTick()
        this.mute(curr)
        this.playMasterDesktop(curr)
      }
    }
  },
  methods: {
    // 桌面共享暂不需要音频
    async mute($streamId) {
      if (!this.rtc) return
      const streamId = $streamId || this.desktopStreamId
      if (!streamId) return
      await this.rtc.setAudioVolume({ streamId }, 0).catch(() => null)
    },
    async playMasterDesktop($streamId) {
      if (!this.rtc) return
      const streamId = $streamId || this.desktopStreamId
      const videoNode = streamId
      if (!streamId) return
      if (this.play) return
      this.play = true
      try {
        if (this.isMaster) {
          await this.rtc.playStream({ streamId, videoNode })
        } else {
          await this.rtc.subscribe({ streamId, videoNode })
        }
      } catch (e) {
        console.error('播放共享桌面流失败', e)
        this.play = false
      }
    },
    async stopMasterDesktop($streamId) {
      if (!this.rtc) return
      const streamId = $streamId || this.desktopStreamId
      if (!streamId) return
      if (!this.play) return
      this.play = false
      try {
        if (this.isMaster) {
          // 流不存在说明已经被删除，不用理会了
          await this.rtc.stopStream({ streamId }).catch(e => e.code === '611006' ? null : Promise.reject(e))
        } else {
          // 流不存在说明已经被删除，不用理会了 611006 代表流不存在
          await this.rtc.unsubscribe({ streamId }).catch(e => e.code === '611006' ? null : Promise.reject(e))
        }
      } catch (e) {
        console.error('停止播放共享桌面流失败', e)
      }
    }
  },
  beforeDestroy() {
    this.stopMasterDesktop()
  },
  computed: {
    rtc() {
      return this.$store.state.sdk.$rtc
    },
    isMaster() {
      return this.$store.state.user.identity === IDENTITY.master
    },
    desktopStreamId() {
      if (this.isMaster) return this.$store.state.stream.desktop?.streamId
      return this.$store.state.stream.masterDesktop?.streamId
    }
  }
}
</script>

<style lang="less" scoped>
.MainContentSC {
  display: flex;
  flex: 1;
  background-color: black;
  width: 100%;
  height: 100%;
  .share.play {
    display: flex;
    margin: auto;
  }
  .share.hide {
    margin: auto;
    height: 136px;
    color: #666666;
    font-size: 36px;
    text-align: center;
  }
}
</style>
