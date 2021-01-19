<template>
  <div class="mainSide">
    <div class="mainSideMenu">
      <div
        @click="clooseType(item)"
        v-for="item in sideArr"
        :key="item.id"
        :class="{ sideItem: true, active: item.id === sideActive }"
        :style="{ display: item.id === 'desktopShare' && !isMaster ? 'none' : 'flex' }"
      >
        <i :class="['iconfont', item.icon]"></i>
        <span>{{ item.name }}</span>
      </div>
    </div>
    <div class="mainSideSet" style="visibility: hidden">
      <i class="iconfont iconicon-shezhi"></i>
      <span>设置</span>
    </div>
  </div>
</template>

<script>
import {IDENTITY} from "@/utils";

export default {
  name: 'mainSide',
  components: {},
  props: ['onSideChange'],
  data: function() {
    return {
      sideArr: [
        {
          name: '白板',
          id: 'board',
          icon: 'iconicon-baiban'
        },
        {
          name: '文档',
          id: 'file',
          icon: 'iconicon-wendang'
        },
        // {
        //   name: '表单',
        //   id: 'form',
        //   icon: 'iconicon-biaodan'
        // },
        {
          name: '桌面共享',
          id: 'desktopShare',
          icon: 'iconicon-zhuomiangongxiang'
        }
      ]
    }
  },
  computed: {
    isMaster() {
      return this.$store.state.user.identity === IDENTITY.master
    },
    sideActive() {
      return this.$store.state.side_active
    }
  },
  methods: {
    clooseType: function(item) {
      // if (this.side_active === item.id) return
      this.onSideChange(this.sideActive, item, (item) => this.change(item))
    },
    change: function (item) {
      if (!item) return
      this.$store.commit('setSideActive', item.id)
    }
  }
}
</script>

<style lang="less" scoped>
.mainSide {
  width: 80px;
  color: #aaa;
  background: #111;
  box-shadow: inset 0 1px 0 0 #000000;
  display: flex;
  flex-direction: column;
  flex: none;
  .mainSideMenu {
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
  .mainSideSet {
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
