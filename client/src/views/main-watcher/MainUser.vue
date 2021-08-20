<template>
  <div class="main-user">
    <div class="main-user-menu">
      <div
        v-for="item in menuArr"
        :key="item.type"
        @click="clooseMenu(item)"
        :class="['user-menu-item', item.type === activeMenu ? 'active' : '']"
      >
        {{ item.name }}
      </div>
    </div>
    <div class="main-user-content">
      <TalkBox v-show="activeMenu === 'talk'"/>
      <DocChapterBox v-show="isVod && activeMenu === 'menus'"/>
    </div>
  </div>
</template>

<script>
import TalkBox from '../shard/parts/TalkBox'
import DocChapterBox from './parts/DocChapterBox'

export default {
  name: 'MainUser',
  components: {TalkBox, DocChapterBox},
  data: function () {
    const menuArr = [
      {
        name: '聊天',
        type: 'talk'
      },
    ]
    return {
      activeMenu: 'talk',
      menuArr: menuArr,
    }
  },
  mounted() {
    if (this.$store.getters.getSdkOption.token) this.addMenu()
    setTimeout(() => this.addMenu(), 100)
  },
  computed: {
    chat() {
      return this.$store.getters.chat
    },
    hasOp() {
      return this.$store.getters.hasOp
    },
    isVod() {
      return this.$store.getters.isVod
    }
  },
  methods: {
    addMenu() {
      if (this.isVod) {
        if (this.menuArr.filter(i => i.type === 'menus').length) return
        this.menuArr.push({
          name: '文档目录',
          type: 'menus'
        })
      }
    },
    clooseMenu(item) {
      if (!this.isVod && !this.chat) return
      this.activeMenu = item.type
    }
  }
}
</script>

<style lang="less" scoped>
.main-user {
  width: 300px;
  background: #111;
  display: flex;
  flex: none;
  flex-direction: column;
  border-top: 1px black solid;

  .main-user-menu {
    height: 40px;
    display: flex;
    justify-content: space-between;
    justify-content: space-around;
    padding: 0px 25px;
    border-bottom: 1px solid #000;

    .user-menu-item {
      width: 64px;
      color: #999;
      height: 38px;
      text-align: center;
      font-size: 16px;
      line-height: 38px;
      cursor: pointer;
      position: relative;
      word-break: break-all;

      &.active {
        color: #1e90ff;
        position: relative;

        &:after {
          content: ' ';
          display: block;
          position: absolute;
          font-size: 0;
          height: 2px;
          width: 100%;
          background: #1e90ff;
        }
      }
    }
  }

  .main-user-content {
    height: 504px;
    overflow: hidden;
    flex: 1;
  }
}
</style>
