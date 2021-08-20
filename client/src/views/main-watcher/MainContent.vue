<template>
  <div class="main-content">
    <!-- 连麦列表-->
    <RemoteStreamList ref="remotes"/>

    <!-- 非直播状态观众/嘉宾显示-->
    <MainContentNotLive v-show="showType===0 && !livein"/>
    <!-- 白板(1)/文档(2)操作 -->
    <MainContentDoc v-show="showType===1" ref="doc"/>
    <!-- 屏幕共享-->
    <MainContentSC v-if="showType===4" ref="desktop"/>

    <div class="control out-ctr" v-show="sm2">
      <div class="control-wrap">
        <div title="切换大屏" class="control-item" @click="changeSM">
          <i class="el-icon el-icon-copy-document" style="margin: 6px 8px;" />
        </div>
      </div>
    </div>

    <!-- 表单操作(弹出来的menu)-->
    <div class="main-modal-full" v-if="showModal">
      <!-- 设置(弹出来的)-->
      <MainSettingsSC @close="onCloseSetting" :option="showSettingOption" v-if="showSetting"/>
      <!-- 表单(弹出来的)-->
      <MainAnswerSC @close="onCloseAnswer" :answer="showAnswerOption" v-if="showAnswer"/>
    </div>
  </div>
</template>

<script>
import RemoteStreamList from '../shard/parts/RemoteStreamList'
import MainContentDoc from './parts/MainContentDoc'
import MainContentSC from '../shard/parts/MainContentSC'
import MainContentNotLive from '../shard/parts/MainContentNotLive'
import MainSettingsSC from '../shard/modals/MainSettingsSC'
import MainAnswerSC from '../shard/modals/MainAnswerSC'

export default {
  name: 'MainContent',
  components: {
    MainContentDoc,
    MainContentSC,
    MainContentNotLive,
    MainSettingsSC,
    MainAnswerSC,
    RemoteStreamList
  },
  mounted() {
    this.eventListen('setting')
    this.eventListen('answer')
  },
  data: () => ({
    showSetting: false,
    showDeviceSelect: false,
    showAnswer: false,
    showAnswerOption: null,
    showDeviceSelectOption: null,
    showSettingOption: null,
  }),
  methods: {
    eventListen(name) {
      const $name = name.split('')
      $name[0] = $name[0].toUpperCase()
      name = $name.join('')
      const names = ['onShow' + name, 'onClose' + name, 'show' + name, 'close' + name]
      if (!this[names[0]] || !this[names[1]]) return
      const onShow = this[names[0]].bind(this)
      const onClose = this[names[1]].bind(this)
      this.$root.$on(names[2], onShow)
      this.$root.$on(names[3], onClose)
      this.$once('hook:beforeDestroy', () => this.$root.$off(names[2], onShow))
      this.$once('hook:beforeDestroy', () => this.$root.$off(names[3], onClose))
    },
    changeSM() {
      this.$store.state.smChange = !this.$store.state.smChange
    },
    onShowSetting() {
      this.showSetting = true
    },
    onCloseSetting() {
      this.showSetting = false
    },
    onShowDeviceSelect(option) {
      this.showDeviceSelect = true
      this.showDeviceSelectOption = option
    },
    onCloseDeviceSelect() {
      this.showDeviceSelect = false
      this.showDeviceSelectOption = null
    },
    onShowAnswer(option) {
      const {data} = option
      this.showAnswer = true
      this.showAnswerOption = data
    },
    onCloseAnswer() {
      this.showAnswer = false
      this.showAnswerOption = null
    },
  },
  computed: {
    sm2() {
      return this.$store.state.smChange
    },
    livein() {
      return this.$store.getters.livein
    },
    showModal() {
      return this.showSetting || this.showAnswer || this.showDeviceSelect
    },
    active() {
      return this.$store.state.side_active
    },
    showType() {
      const desktop = this.$store.getters.showDesktopShareContent
      const pub = this.$store.getters.hasMeStreamPublish
      // NOT LIVEIN 非观众/嘉宾显示
      if (!this.livein) return 0
      // 桌面共享覆盖其他类型显示
      if (desktop && pub) return 4

      const active = this.active || 'board'
      if (active === 'board' || active === 'file') return 1
      // if (active === 'desktopShare') return 4
      return 1
    },
  },
}
</script>

<style lang="less" scoped>
.main-content {
  min-height: 0;
  min-width: 0;
  flex: 1;
  background: #fff;
  color: #000;
  display: flex;
  flex-direction: column;
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
      right: 16px;
      top: 16px;
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

.main-content:hover .out-ctr {
  display: block;
  z-index: 101;
}

.zanwei {
  height: 100%;
  width: 100%;
}

.main-modal-full {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: rgba(51, 51, 51, 0.5);
  top: 0;
  left: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
