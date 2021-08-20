<template>
  <div class="remote-stream-list" v-if="rtc" v-show="remoteStreamList && remoteStreamList.length">
      <StreamItemRemote
        v-show="remoteStreamList && remoteStreamList.length"
        v-for="item of remoteStreamList"
        style="width: 200px"
        :key="item.stream.streamId"
        :user="item.user"
        :local="item.local"
        :stream="item.stream"
        :is="item.local ? hasOp ? 'StreamItemLocalMaster' : 'StreamItemLocal' : 'StreamItemRemote'"
        :rtc="rtc"
        :handleDevice="handleDevice"
        :has-op="hasOp"
        @downInav="downInav"
        @downInavUser="downInavUser"
      />
  </div>
</template>

<script>
import StreamItemRemote from '@/components/Stream/StreamItemRemote'
import StreamItemLocal from '@/components/Stream/StreamItemLocal'
import StreamItemLocalMaster from '@/components/Stream/StreamItemLocalMaster'
import {promisify} from '@/utils'
import {BUS_CUSTOM_EVENTS} from '@/common/contant'

export default {
  name: 'RemoteStreamList',
  components: {StreamItemRemote, StreamItemLocal,StreamItemLocalMaster},
  data: () => ({
  }),
  methods: {
    getUser(userId) {
      return this.$store.state.userMap[userId]
    },
    downInav(user) {
      this.$parent.$parent.$bus.emit(BUS_CUSTOM_EVENTS.DOWN)
    },
    downInavUser(user) {
      if (!user) return
      this.$store.dispatch('inavDown', { userId: user.accountId })
    },
    async handleDevice(data) {
      const device = data.device
      const mute = data.mute
      const streamId = data.streamId
      const stream = data.stream
      if (!stream) return
      const userId = stream.userId

      if (stream.local) {
        if (device === 'mic') {
          await promisify(this.rtc, this.rtc.muteAudio)({streamId, mute})
          if (this.$store) this.$store.commit('setRemoteStreamAVStatus', {
            streamId,
            muteStream: {audio: mute, video: !this.stream?.video}
          })
        }
        else if (device === 'camera') {
          await promisify(this.rtc, this.rtc.muteVideo)({streamId, mute})
          if (this.$store) this.$store.commit('setRemoteStreamAVStatus', {
            streamId,
            muteStream: {audio: !this.stream?.audio, video: mute}
          })
        }
      } else {
        await this.$store.dispatch('inavCtrDevice', { device, userId, close: mute })
      }
    },
  },
  mounted() {
  },
  computed: {
    rtc () {
      return this.$store.getters.rtc
    },
    isMaster() {
      return this.$store.getters.isMaster
    },
    hasOp() {
      return this.$store.getters.hasOp
    },
    masterId() {
      return this.$store.state.stream.masterUserId
    },
    notMasterRemote() {
      return this.$store.state.stream.remote.filter(stream => stream.userId !== this.masterId)
    },
    remoteStreamList () {
      const localStream = this.$store.state.stream.local
      // 过滤出主持人的流，主持人不显示在这里
      const list = this.notMasterRemote.map(stream => ({ stream, user: this.getUser(stream.userId), local: false }))
      // 不是主持人，则把本地流显示在这里
      if (!this.isMaster && localStream?.streamId) {
        list.push({ stream: localStream, user: this.$store.state.user, local: true })
      }
      return list
    }
  },
  destroyed() {
    // store.playStream
  }
}
</script>

<style lang="less" scoped>
.remote-stream-list {
  height: 113px;
  display: flex;
  justify-content: center;
  padding: 0;
  background-color: black;
  color: #000;
  //.RemoteStreamItem {
  //  width: 200px;
  //}
}
</style>
