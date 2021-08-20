<template>
  <div class="main-side">
    <div class="main-side-menu">
      <div
        @click="chooseType(item)"
        v-for="item in sideArray"
        :key="item.id"
        :class="{ sideItem: true, active: item.id === sideActive }"
      >
        <i :class="['iconfont', item.icon]"></i>
        <span>{{ item.name }}</span>
      </div>
    </div>
    <div class="main-side-set" @click="chooseSetting">
      <i class="iconfont iconicon-shezhi"></i>
      <span>设置</span>
    </div>
  </div>
</template>

<script>

import {IDENTITY} from '@/utils'
import VhDialog from '@/components/Modal'
import ConfirmDialogCtor from '@/components/Modal/components/confirm'

const sideArray = [
  {
    name: '白板',
    id: 'board',
    icon: 'iconicon-baiban',
  },
  {
    name: '文档',
    id: 'file',
    icon: 'iconicon-wendang',
  },
  {
    name: '表单',
    id: 'form',
    icon: 'iconicon-biaodan',
    triggerOnly: true,
  },
  {
    name: '桌面共享',
    id: 'desktopShare',
    icon: 'iconicon-zhuomiangongxiang',
    triggerOnly: true,
  }
]

export default {
  name: 'MainSide',
  components: {},
  props: [],
  data: function () {
    return {}
  },
  computed: {
    sideActive() {
      return this.$store.state.side_active
    },
    sideArray() {
      const identity = this.$store.getters.identity
      if (identity === IDENTITY.master) return sideArray
      if (identity === IDENTITY.helper) return sideArray.filter(i => !(i.id === 'desktopShare'))
      return []
    },
    isMaster() {
      return this.$store.getters.isMaster
    }
  },
  methods: {
    chooseType: function (item) {
      const params = {to: item.id, from: this.sideActive}
      if (params.to === 'form') return this.$root.$emit('showForm')
      if (params.from === params.to && params.from !== 'desktopShare') {
        this.changeType(params)
        return
      }

      const remote = this.$store.state.stream.desktop?.streamId
      if (!remote && params.from !== params.to && params.to !== 'desktopShare' && params.from !== 'desktopShare') {
        this.changeType(params)
        return
      }

      // open
      if (params.to === 'desktopShare') {
        if (remote) return this.$store.commit('setSideActive', params.to)
        return this.$emit('openShare', params)
      }

      // close
      if (!remote) return
      const onClose = (ok) => {
        if (!ok) return
        this.$emit('closeShare', params)
      }
      const opt = {title: '提示', content: '是否关闭桌面共享？', onClose}
      VhDialog.open(ConfirmDialogCtor, this, opt)
    },
    chooseSetting: function () {
      return this.$root.$emit('showSetting')
    },
    changeType: function ({to, from}) {
      if (!to) return
      if (to === this.sideActive) return
      this.$store.commit('setSideActive', to)
    }
  }
}
</script>

<style lang="less" scoped>
.main-side {
  width: 80px;
  color: #aaa;
  background: #111;
  box-shadow: inset 0 1px 0 0 #000000;
  display: flex;
  flex-direction: column;
  //flex: none;

  .main-side-menu {
    width: 100%;
    flex: 1;

    .sideItem {
      width: 100%;
      height: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;

      > i {
        font-size: 24px;
      }

      &:hover {
        background: #222222;
        color: #1e90ff;
      }

      &.active {
        background: #222222;
        color: #1e90ff;
      }
    }
  }

  .main-side-set {
    width: 100%;
    height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;

    > i {
      font-size: 24px;
    }

    &:hover {
      background: #222222;
      color: #1e90ff;
    }
  }
}
</style>
