<template>
  <div class="MainContent">
    <!-- 连麦列表-->
    <RemoteStreamList />

    <!-- 白板(1)/文档(2)操作 -->
    <MainContentDoc v-show="showType === 1" />
    <!-- 表单操作-->
    <div class="zanwei" v-show="showType === 3"></div>
    <!-- 屏幕共享-->
    <MainContentSC v-show="showType === 4" />
  </div>
</template>

<script>
import RemoteStreamList from '@/views/Main/component/RemoteStreamList'
import MainContentDoc from './component/MainContentDoc'
import MainContentSC from './component/MainContentSC'
import { IDENTITY } from '@/utils'
export default {
  name: 'MainContent',
  components: { MainContentDoc, MainContentSC, RemoteStreamList },
  data: () => ({}),
  methods: {},
  computed: {
    showType() {
      const active = this.$store.state.side_active
      if (active === 'board' || active === 'file') return 1
      if (active === 'desktopShare') return 4
      if (active === 'form') return 3
      return 1
    },
    hasOp: function() {
      return this.$store.state.user.identity === IDENTITY.helper || this.$store.state.user.identity === IDENTITY.master
    },
    isEnd() {
      return this.$store.state.liveStartAt === -1
    },
  },
}
</script>

<style lang="less" scoped>
.MainContent {
  min-height: 0;
  min-width: 0;
  flex: 1;
  background: #fff;
  color: #000;
  display: flex;
  flex-direction: column;
  position: relative;
}
.zanwei {
  height: 100%;
  width: 100%;
}
</style>
