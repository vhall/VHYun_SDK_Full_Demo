<template>
  <div class="player-box">
    <div :id="videoNode" class="player"></div>
    <div class="default" v-show="isLoaded">
      <img src="./images/视频空页面@2x.png" alt="" />
    </div>
  </div>
</template>

<script>
import { initPlayer } from '@/utils/sdk'
import { videoAutoPlay, videoAutoPlaySupport } from '@/utils/autoplay'
export default {
  name: 'PlayerItem',
  components: {},
  props: {},
  data() {
    return {
      $player: null,
      playing: false,
      videoNode:
        'player_' +
        Math.random()
          .toString()
          .slice(2, 6),
      isLoaded: true,
    }
  },
  created() {
    this.$root.$once('startInitDoc', () => {
      this.initPlayer()
    })
    this.$once('hook:beforeDestroy', () => {
      this.$player && this.$player.destroy()
    })
  },
  computed: {
    sdkOption() {
      return this.$store.getters.getSdkOption
    }
  },
  methods: {
    toggle() {
      if (this.$player.getIsPause()) {
        this.$player.play()
      } else {
        this.$player.pause()
      }
      this.playing = !this.$player.getIsPause()
    },
    async initPlayer() {
      if (process.env.NODE_ENV !== 'production') console.time('初始化播放器SDK')
      const { appId, accountId, token, isVod, paasLiveId } = this.sdkOption
      const videoNode = this.videoNode
      const option = {
        appId, // 应用ID   必填
        accountId, // 第三方用户ID     必填
        token, // access_token  必填
        type: isVod ? 'vod' : 'live', // live 直播  vod 点播  必填
        videoNode: videoNode, // 播放器的容器
        autoplay: true, // 是否自动播放，默认为true。
        liveOption: {
          type: 'auto', // 直播播放类型   auto | hls | flv
          roomId: paasLiveId, // 直播房间ID  必填
        },
      }
      try {
        this.$player = await initPlayer(option)
        this.addPlayerListen()
      } catch (error) {
        console.log(error)
      }
      if (process.env.NODE_ENV !== 'production') console.timeEnd('初始化播放器SDK')

      if (!(await videoAutoPlaySupport())) {
        // 解决刷新后不自动播放的问题
        const wrap = window.document.getElementById(videoNode)
        if (!wrap) return
        const v = wrap.getElementsByTagName('video')[0]
        if (!v) return
        await videoAutoPlay(v, this.local).catch(() => null)
      }
    },
    addPlayerListen() {
      this.$player.on(window.VhallPlayer.LOADED, () => {
        this.isLoaded = false
      })
      this.$player.on(window.VhallPlayer.ERROR, () => {
        this.isLoaded = true
      })
    },
  },
}
</script>

<style lang="less" scoped>
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
