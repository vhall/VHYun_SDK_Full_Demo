<template>
  <div class="RemoteStreamList" v-if="rtc" v-show="remoteStreamList && remoteStreamList.length">
      <StreamItem
        v-show="remoteStreamList && remoteStreamList.length"
        v-for="item of remoteStreamList"
        style="width: 200px"
        :key="item.stream.streamId"
        :user="item.user"
        :local="item.local"
        :stream="item.stream"
        :rtc="rtc"
      />
  </div>
</template>

<script>
import StreamItem from '@/components/StreamItem'
import {IDENTITY} from "@/utils";
export default {
  name: 'RemoteStreamList',
  components: {StreamItem},
  data: () => ({
  }),
  methods: {
    getUser(userId) {
      return this.$store.state.userMap[userId]
    }
  },
  mounted() {
  },
  computed: {
    rtc () {
      return this.$store.state.sdk.$rtc
    },
    isMaster() {
      return this.$store.state.user.identity === IDENTITY.master
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
.RemoteStreamList {
  height: 113px;
  display: flex;
  justify-content: center;
  padding: 0;
  background-color: black;
  color: #000;
  .RemoteStreamItem {
    width: 200px;
  }
}
</style>
