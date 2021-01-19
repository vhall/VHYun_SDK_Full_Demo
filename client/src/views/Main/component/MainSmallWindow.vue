<template>
  <div class="MainSmallWindowWarp">
    <div v-if="type===1" class="MainSmallWindowWarpItem">
      <!-- 本地/主持人摄像头 -->
      <StreamItem :rtc="rtc" :stream="stream" :user="user" :local="userLocal" />
    </div>
    <div v-if="type===3" class="MainSmallWindowWarpItem">
      <PlayerItem />
    </div>

    <div v-show="type===2">
      <!-- 桌面共享 -->
    </div>

    <div v-show="type===2">
      <!-- 文档共享 -->
    </div>
  </div>
</template>

<script>
import StreamItem from "@/components/StreamItem"
import PlayerItem from "@/components/PlayerItem"
import { IDENTITY } from "@/utils"

export default {
  name: 'MainSmallWindow',
  components: { StreamItem,PlayerItem },
  data(){
    return {}
  },
  methods: {
  },
  mounted() {
  },
  computed: {
    rtc () {
      return this.$store.state.sdk.$rtc
    },
    type(){
      if( this.$store.getters.getUser.identity === IDENTITY.player ) return 3
      return 1
    },
    stream () {
      if (this.userLocal) return this.$store.state.stream.local
      return this.$store.state.stream.masterLocal
    },
    user() {
      if (this.userLocal) return this.$store.state.user
      const masterUserId = this.$store.state.stream.masterUserId
      return this.$store.state.userMap[masterUserId]
    },
    // 本地
    userLocal () {
      // 主持人需要使用本地摄像头
      if (this.$store.state.user.identity === IDENTITY.master) return true
      return false
    }
  },
}
</script>

<style lang="less" scoped>
.MainSmallWindowWarp {
  width: 100%;
  height: 100%;
}
.MainSmallWindowWarpItem {
  width: 100%;
  height: 100%;
}
</style>
