<template>
  <div class="talk-box">
    <div class="talk-cont" ref="talkbox">
      <OtherMessageItem
        v-for="msg in list"
        :key="msg.msgId"
        :is="msg.showType"
        :msg="msg"
        :user="msg.user"
        @action="onMessageAction"
      />
      <div class="zhanwei messageItemInfo"></div>
    </div>
    <div class="dis-all" v-if="$store.state.imDisableAll">
      <i class="iconfont iconicon-jinyan"></i>
      <span>全体禁言中</span>
    </div>
    <div class="message-box">
      <div class="message-header">
        <div class="message_icon_pic"></div>
        <div class="message_disable" v-show="!isPlayerOrGurst">
          <span class="dis_word">全体禁言</span>
          <VhSwitch v-model="$store.state.imDisableAll" @click="switchAllDisable"/>
        </div>
      </div>
      <div class="messageCont">
        <input
          :disabled="isDisable"
          type="text"
          ref="input"
          class="message_input"
          @input="inputChange"
          @keyup.enter="sendTextMessage"
          :placeholder="isDisable ? '您已被禁言' : '说点什么吧'"
        />
        <svg class="iconfont iconfasong_icon message_icon" viewBox="0 0 1024 1024"
             :class="[value && value.length > 0 ? 'shuru' : '']" @click="sendTextMessage">
          <path
            d="M947.2 111.2576l-0.0512 1.2288-0.0768 1.152-0.1792 1.536a23.2704 23.2704 0 0 1-0.3328 2.2784l-0.0512 0.0256-160.4864 802.3552a33.9712 33.9712 0 0 1-53.7088 20.5312l-265.856-199.3728-128.9984 154.112c-19.6864 23.5008-57.3184 10.88-59.904-18.5856l-0.128-3.2256V599.1936l-187.008-140.2368a33.9712 33.9712 0 0 1 7.7568-58.7264L900.5568 79.2832A34.0224 34.0224 0 0 1 947.2 111.2576z m-85.632 84.608L373.3248 586.4192l356.6336 267.4688 131.6096-658.0224zM345.3696 650.1888v129.5872l66.6368-79.616-66.6368-49.9712z m367.4624-422.4L179.5584 441.088l137.6256 103.2192L712.832 227.7888z"
            fill="#FFFFFF"></path>
          <path
            d="M947.2 111.2576l-0.0512 1.2288-0.0768 1.152-0.1792 1.536a23.2704 23.2704 0 0 1-0.3328 2.2784l-0.0512 0.0256-160.4864 802.3552a33.9712 33.9712 0 0 1-53.7088 20.5312l-265.856-199.3728-128.9984 154.112c-19.6864 23.5008-57.3184 10.88-59.904-18.5856l-0.128-3.2256V599.1936l-187.008-140.2368a33.9712 33.9712 0 0 1 7.7568-58.7264L900.5568 79.2832A34.0224 34.0224 0 0 1 947.2 111.2576z m-85.632 84.608L373.3248 586.4192l356.6336 267.4688 131.6096-658.0224zM345.3696 650.1888v129.5872l66.6368-79.616-66.6368-49.9712z m367.4624-422.4L179.5584 441.088l137.6256 103.2192L712.832 227.7888z"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
import VhSwitch from '@/components/VhSwitch'
import TextMessageItem from '@/components/Chat/TextMessageItem'
import FormMessageItem from '@/components/Chat/FormMessageItem'
import OtherMessageItem from '@/components/Chat/OtherMessageItem'
import {IDENTITY} from '@/utils'

export default {
  name: 'UserTalkBox',
  components: {VhSwitch, TextMessageItem, FormMessageItem, OtherMessageItem},
  computed: {
    chat() {
      return this.$store.getters.chat
    },
    isDisable: function () {
      // 暂时只判断全员禁言
      return this.$store.state.imDisableAll || this.$store.state.imDisable
    },
    isPlayerOrGurst: function () {
      return [IDENTITY.player, IDENTITY.guest].includes(this.$store.getters.getUser.identity)
    },
    list() {
      return this.$store.state.imMessageList
    },
  },
  data: function () {
    return {
      sendMsgDisable: false,
      value: '',
    }
  },
  mounted() {
  },
  methods: {
    onMessageAction(type, data) {
      if (type === 'answer') {
        this.$root.$emit('showAnswer', { data })
      }
      else if (type === 'delete') {
        // 删除消息
      }
    },
    // 输入
    inputChange(e) {
      this.value = e.target.value
    },
    // 全员禁言
    async switchAllDisable() {
      if (!this.chat) return
      const dis_all = this.$store.state.imDisableAll
      await this.$store.dispatch('switchAllMute', !dis_all)
    },
    // 发送聊天消息
    async sendTextMessage() {
      if (!this.chat) return
      const value = (this.value || '').trim()
      if (!value) return
      // 避免快速点击发送多条消息
      if (this.sendMsgDisable) return
      // 太长的话，弹幕显示不出来
      const MAX_LEN = this.$store.getters.isVod ? 150 : 900
      if (value.length > MAX_LEN) return this.$message.error('消息过长')
      this.sendMsgDisable = true
      try {
        await this.$store.dispatch('emitTextChat', value)
      } catch (e) {
        this.$message.error(e.message || '消息发送失败')
        return
      } finally {
        this.sendMsgDisable = false
      }
      // 成功回调
      this.$refs.input.value = ''
      this.value = ''
    },
  },
  watch: {
    // 列表更新后滚动到底部
    list: function (val) {
      let div = this.$refs.talkbox
      this.$nextTick(() => {
        div.scrollTop = div.scrollHeight
      })
    }
  }
}
</script>

<style lang="less" scoped>
.talk-box {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;

  .talk-cont {
    -ms-overflow-style: none;
    overflow: -moz-scrollbars-none;
  }

  .talk-cont::-webkit-scrollbar {
    display: none;
    width: 0 !important;
  }

  .talk-cont {
    min-height: 400px;
    will-change: transform;
    overflow-x: hidden;
    overflow-y: auto;
    flex: 1;
    height: calc(~'100vh - 370px');
    padding: 0px 16px;

    .zhanwei {
      width: 100%;
      height: 20px;
    }
  }

  .dis-all {
    height: 32px;
    width: 300px;
    position: absolute;
    background: #1e90ff;
    bottom: 104px;
    left: 0px;
    color: #fff;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;

    > i {
      margin-right: 5px;
    }
  }

  .message-box {
    height: 104px;
    background: #222;
    padding: 15px;
    box-sizing: border-box;
    flex: none;

    .message-header {
      margin-top: 5px;
      display: flex;
      justify-content: space-between;
      height: 20px;
      align-items: center;

      .message_disable {
        display: flex;
        color: #999;
        align-items: center;

        .dis_word {
          margin-right: 4px;
        }
      }
    }

    .messageCont {
      margin-top: 12px;
      width: 100%;
      height: 40px;
      background: #151515;
      padding: 10px 16px;
      border-radius: 100px;
      box-sizing: border-box;
      position: relative;

      .message_icon {
        color: #999;
        fill: #999;
        position: absolute;
        right: 16px;
        top: 8px;
        cursor: pointer;
        width: 16px;
        height: 24px;

        &.shuru {
          color: #f7f7f7;
          fill: #f7f7f7;
        }

        &:hover {
          color: #1e90ff;
          fill: #1e90ff;
        }
      }

      .message_input {
        width: 100%;
        box-sizing: border-box;
        height: 100%;
        background: none;
        outline: none;
        color: #f7f7f7;
        font-size: 14px;
        border: none;
        padding-right: 18px;
        display: inline-block;
      }
    }
  }
}
</style>
