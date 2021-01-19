<template>
  <div class="talkBox">
    <div class="talkCont" ref="talkbox">
      <div class="messageItemInfo" v-for="item in list" :key="item.msg_id" :data-msgid="item.msgId" :data-userid="item.userId" :data-identity="item.identity">
        <div class="infoImg" :style="{ backgroundColor: item.bg, backgroundImage: item.avatar ? `url(${item.avatar})` : '' }">
          {{ item.title }}
        </div>
        <div class="infoCont">
          <div class="info_h">
            <span
              class="title"
              v-if="item.identity && item.identity !== IDENTITY.player"
              :style="{ color: IDENTITY_COLORS[item.identity][0], backgroundColor: IDENTITY_COLORS[item.identity][1] }"
            >{{ IDENTITY_NAME[item.identity] || IDENTITY_NAME.player  }}</span>
            <span :title="item.nickName">{{ stringCut(item.nickName || item.userId, 12) }}</span>
          </div>
          <div class="info_c">{{ item.data }}</div>
        </div>
      </div>
      <div class="zhanwei messageItemInfo"></div>
    </div>
    <div class="disAll" v-if="$store.state.imDisableAll">
      <i class="iconfont iconicon-jinyan"></i>
      <span>全体禁言中</span>
    </div>
    <div class="messageBox">
      <div class="messageHeader">
        <div class="message_icon_pic"></div>
        <div class="message_disable" v-show="!isPlayerOrGurst">
          <span class="dis_word">全体禁言</span>
          <VhSwitch v-model="$store.state.imDisableAll" @click="checkAllDisable" />
        </div>
      </div>
      <div class="messageCont">
        <input
          :disabled="isDisable"
          type="text"
          ref="input"
          class="message_input"
          @input="inputChange"
          @keyup.enter="sendMsg"
          :placeholder="isDisable ? '您已被禁言' : '说点什么吧'"
        />
        <svg class="iconfont iconfasong_icon message_icon" viewBox="0 0 1024 1024" :class="[value && value.length > 0 ? 'shuru' : '']" @click="sendMsg">
          <path d="M947.2 111.2576l-0.0512 1.2288-0.0768 1.152-0.1792 1.536a23.2704 23.2704 0 0 1-0.3328 2.2784l-0.0512 0.0256-160.4864 802.3552a33.9712 33.9712 0 0 1-53.7088 20.5312l-265.856-199.3728-128.9984 154.112c-19.6864 23.5008-57.3184 10.88-59.904-18.5856l-0.128-3.2256V599.1936l-187.008-140.2368a33.9712 33.9712 0 0 1 7.7568-58.7264L900.5568 79.2832A34.0224 34.0224 0 0 1 947.2 111.2576z m-85.632 84.608L373.3248 586.4192l356.6336 267.4688 131.6096-658.0224zM345.3696 650.1888v129.5872l66.6368-79.616-66.6368-49.9712z m367.4624-422.4L179.5584 441.088l137.6256 103.2192L712.832 227.7888z" fill="#FFFFFF"></path><path d="M947.2 111.2576l-0.0512 1.2288-0.0768 1.152-0.1792 1.536a23.2704 23.2704 0 0 1-0.3328 2.2784l-0.0512 0.0256-160.4864 802.3552a33.9712 33.9712 0 0 1-53.7088 20.5312l-265.856-199.3728-128.9984 154.112c-19.6864 23.5008-57.3184 10.88-59.904-18.5856l-0.128-3.2256V599.1936l-187.008-140.2368a33.9712 33.9712 0 0 1 7.7568-58.7264L900.5568 79.2832A34.0224 34.0224 0 0 1 947.2 111.2576z m-85.632 84.608L373.3248 586.4192l356.6336 267.4688 131.6096-658.0224zM345.3696 650.1888v129.5872l66.6368-79.616-66.6368-49.9712z m367.4624-422.4L179.5584 441.088l137.6256 103.2192L712.832 227.7888z"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
import VhSwitch from '@/components/VhSwitch'
import {IDENTITY, IDENTITY_COLORS, IDENTITY_NAME, promisify, randomHashColor, stringCut} from '@/utils'
// 聊天消息最多保留条数
const MSGBOX_MAX_NUMBER = 500
export default {
  name: 'UserTalkBox',
  components: { VhSwitch },
  computed: {
    chat() {
      return this.$store.state.sdk.$chat
    },
    isDisable: function() {
      // 暂时只判断全员禁言
      return this.$store.state.imDisableAll || this.$store.state.imDisable
    },
    isPlayerOrGurst:function(){
      return [IDENTITY.player, IDENTITY.guest].includes(this.$store.getters.getUser.identity)
    }
  },
  data: function() {
    return {
      IDENTITY: IDENTITY,
      IDENTITY_NAME: IDENTITY_NAME,
      IDENTITY_COLORS: IDENTITY_COLORS,
      stringCut: stringCut,
      sendMsgDisable: false,
      value: '',
      list: []
    }
  },
  mounted() {
  },
  methods: {
    // 输入
    inputChange(e) {
      this.value = e.target.value
    },
    // 全员禁言
    async checkAllDisable() {
      if (!this.chat) return
      const dis_all = this.$store.state.imDisableAll
      const type = dis_all ? window.VhallChat.TYPE_PERMIT_ALL : window.VhallChat.TYPE_DISABLE_ALL
      const res = await promisify(this.chat, this.chat.setDisable)({type}).catch(e => e)
      if (res instanceof Error) return this.$message.warn('操作失败')
    },
    // 获取历史消息
    async getMessageList(chat) {
      const startTime = Date.now() - 1000 * 3600 * 24
      chat = chat ?? this.chat
      if (!chat) return
      const opt = {
        currPage: 1, //当前页
        pageSize: 1000,
        startTime: new Date(startTime).toLocaleDateString(),
        endTime: new Date().toLocaleDateString()
      }
      const res = await promisify(chat, chat.getHistoryList)(opt).catch(e => e)
      if (res instanceof Error) return console.error(res)
      for (const msg of res.list.reverse()) {
        this.appendChatMsg(msg)
      }
    },
    // 添加聊天消息到list
    async appendChatMsg (msg) {
      if (!msg) return
      msg.msgId = msg.msgId ?? msg.msg_id
      msg.userId = msg.accountId || msg.userId || msg.third_party_user_id
      msg.nickName = (msg.nick_name || msg.nickName || msg.context?.nick_name || msg.context?.nickName || '')
      msg.title = (msg.nickName || msg.userId).slice(0, 1).toUpperCase()
      msg.bg = randomHashColor(msg.userId)
      msg.identity = IDENTITY[msg.context?.identity] || IDENTITY.player
      msg.avatar = (msg.avatar || msg.context?.avatar || '')
      msg.identityName = IDENTITY_NAME[msg.identity]
      this.list.push(msg)
      if (this.list.length > MSGBOX_MAX_NUMBER) this.list.shift()
    },
    // 初始化
    init (chat) {
      chat = chat ?? this.chat
      this.getMessageList(chat)
      // 聊天消息
      let onChat = (event) => {
        const type = event.type
        switch (type) {
          // 聊天消息
          case window.VhallChat.TYPE_TEXT:
            this.appendChatMsg({
              data: event.data,
              date_time: event.date_time,
              msg_id: event.msgId,
              nickName: event.context.nick_name,
              avatar: event.context.avatar,
              userId: event.user_id,
              type: event.type,
              context: event.context
            })
            break
          // 频道禁言
          case window.VhallChat.TYPE_DISABLE_ALL:
            this.$store.commit('setImDisableAll', true)
            this.$message.info('全员禁言开启')
            break
          // 解除频道禁言
          case window.VhallChat.TYPE_PERMIT_ALL:
            this.$store.commit('setImDisableAll', false)
            this.$message.info('全员禁言关闭')
            break
          // 禁言消息
          case window.VhallChat.TYPE_DISABLE:
            if (event.target_id === this.$store.state.user.userId) {
              this.$store.commit('setImDisable', true)
              this.$message.info('您已被禁言')
            } else {
              this.$store.commit('addImBlackUserSet', event.target_id)
            }
            break
          // 解除禁言
          case window.VhallChat.TYPE_PERMIT:
            if (event.target_id === this.$store.state.user.userId) {
              this.$store.commit('setImDisable', false)
              this.$message.info('您已被解除禁言')
            } else {
              this.$store.commit('removeImBlackUserSet', event.target_id)
            }
            break
        }
      }

      // 监听聊天消息
      chat.onChat(onChat)
    },
    // 发送聊天消息
    async sendMsg () {
      if (!this.chat) return
      const value = (this.value || '').trim()
      if (!value) return
      // 避免快速点击发送多条消息
      if (this.sendMsgDisable) return
      if (value.length > 900) return this.$message.error('消息过长')
      const body = {
        data: value,
        context: this.$store.state.user,
      }
      this.sendMsgDisable = true
      const res = await promisify(this.chat, this.chat.emitChat, true)(body)
      this.sendMsgDisable = false
      if (res instanceof Error) {
        this.$message.error('消息发送失败')
        console.log(res)
        return
        // JSON类型，{ code: 错误码, message: "", data: {} }
      }
      // 成功回调
      this.$refs.input.value = ''
      this.value = ''
    }
  },
  watch: {
    chat: function(val) {
      if (!val) return
      this.init(val)
    },
    // 列表更新后滚动到底部
    list: function(val) {
      let div = this.$refs.talkbox
      this.$nextTick(() => {
        div.scrollTop = div.scrollHeight
      })
    }
  }
}
</script>

<style lang="less" scoped>
.talkBox {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;

  .talkCont {
    -ms-overflow-style: none;
    overflow: -moz-scrollbars-none;
  }
  .talkCont::-webkit-scrollbar {
    display: none;
    width: 0 !important;
  }

  .talkCont {
    min-height: 400px;
    will-change: transform;
    overflow-x: hidden;
    overflow-y: auto;
    flex: 1;
    height: calc(~'100vh - 370px');
    padding: 0px 16px;
    .messageItemInfo {
      display: flex;
      align-items: flex-start;
      margin-top: 16px;
      .zhanwei {
        width: 100%;
        height: 20px;
      }
      .infoImg {
        flex: none;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: #1e90ff;
        text-align: center;
        line-height: 28px;
        margin-right: 8px;
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
      }
      .infoCont {
        // width: 232px;
        flex: 1;
        .info_h {
          margin-top: 3px;
          color: #999;
          .title {
            word-break: keep-all;
            padding: 0px 6px;
            line-height: 16px;
            font-size: 12px;
            height: 16px;
            display: inline-block;
            border-radius: 9px;
            background: rgba(30, 144, 255, 0.3);
            color: #1e90ff;
            margin-right: 4px;
          }
        }
        .info_c {
          width: 100%;
          overflow: hidden;
          font-size: 14px;
          margin-top: 3px;
          color: #f7f7f7;
          word-break: break-all;
        }
      }
    }
  }
  .disAll {
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
  .messageBox {
    height: 104px;
    background: #222;
    padding: 15px;
    box-sizing: border-box;
    flex: none;
    .messageHeader {
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
