<template>
  <div class="mainUser">
    <div class="userHeader">
      <MainSmallWindow />
    </div>
    <div class="userMenu">
      <div
        v-for="item in menuArr"
        :key="item.type"
        @click="clooseMenu(item)"
        :class="['userMenuItem', item.type === activeMenu ? 'active' : '']"
      >
        {{ item.name }}
      </div>
    </div>
    <div class="userContent">
      <TalkBox v-show="activeMenu === 'talk'" />
      <UserBox v-show="activeMenu === 'user'" />
      <DocMenusBox v-show="isVod && activeMenu === 'menus'" />
    </div>
  </div>
</template>

<script>
import TalkBox from './component/TalkBox'
import UserBox from './component/UserBox'
import DocMenusBox from './component/DocMenusBox'
import MainSmallWindow from "./component/MainSmallWindow"
import {IDENTITY} from "@/utils";
export default {
  name: 'MianUser',
  components: { TalkBox, UserBox, DocMenusBox, MainSmallWindow },
  data: function() {
    const menuArr = [
      {
        name: '讨论',
        type: 'talk'
      },
      {
        name: '用户',
        type: 'user'
      }
    ]
    if (this.isVod) {
      menuArr.push({
        name: '目录',
        type: 'menus'
      })
    }
    return {
      activeMenu: 'talk',
      menuArr: menuArr,
    }
  },
  computed: {
    chat() {
      return this.$store.state.sdk.$chat
    },
    isVod() {
      return this.$store.state.sdkOption.isVod
    }
  },
  methods: {
    clooseMenu: function(item) {
      if (!this.chat) return
      this.activeMenu = item.type
    }
  }
}
</script>

<style lang="less" scoped>
.mainUser {
  width: 300px;
  background: #111;
  display: flex;
  flex: none;
  flex-direction: column;
  border-top: 1px black solid;
  .userHeader {
    height: 169px;
    background: #0f0f0f;
  }
  .userMenu {
    height: 40px;
    display: flex;
    justify-content: space-between;
    justify-content: space-around;
    padding: 0px 25px;
    border-bottom: 1px solid #000;
    .userMenuItem {
      width: 50px;
      color: #999;
      height: 38px;
      text-align: center;
      font-size: 16px;
      line-height: 38px;
      cursor: pointer;
      position: relative;
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
  .userContent {
    height: 504px;
    overflow: hidden;
    flex: 1;
    .talkBox {
      display: flex;
      flex-direction: column;
      height: 100%;
      .talkCont {
        flex: 1;
        min-height: 400px;
      }
      .messageBox {
        height: 104px;
        background: #222;
        padding: 15px;
        box-sizing: border-box;
        .messageHeader {
          margin-top: 5px;
          display: flex;
          justify-content: space-between;
          height: 20px;
          align-items: center;
          background: red;
        }
      }
    }
  }
}
</style>
