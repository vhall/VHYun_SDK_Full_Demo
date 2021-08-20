<template>
  <div class="message-item-info" :data-msgid="msg.msgId" :data-userid="msg.sourceId" :data-identity="user.identity">
    <div class="info-img" :style="{ backgroundColor: user.avatarBackgroundColor, backgroundImage: user.avatarBackgroundImage }">
      {{ user.nickNameTitle }}
    </div>
    <div class="info-cont">
      <div class="info-h">
        <span class="title" v-if="showIdentityName" :style="identityStyle">{{ user.identityName }}</span>
        <span :title="user.nickName">{{ showNickName }}</span>
      </div>
      <div class="info-c">{{ msg.data.content }}</div>
    </div>
  </div>
</template>

<script>
import {IDENTITY, stringCut} from '@/utils'

export default {
  name: 'TextMessageItem',
  data() {
    return {
      IDENTITY: IDENTITY,
      stringCut: stringCut,
    }
  },
  props: {
    msg: Object,
    user: Object,
  },
  computed: {
    showIdentityName() {
      return this.user.identity && this.user.identity !== IDENTITY.player
    },
    identityStyle() {
      return { color: this.user.identityColors[0], backgroundColor: this.user.identityColors[1] }
    },
    showNickName() {
      const nick = this.user.nickName || this.user.userId || this.user.accountId || this.msg.sourceId || '匿名用户'
      return stringCut(nick, 12)
    }
  },
  watch: {},
  methods: {
  },
  mounted() {},
}
</script>

<style lang="less" scoped>
.message-item-info {
  display: flex;
  align-items: flex-start;
  margin-top: 16px;
}
.info-img {
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
.info-cont {
  // width: 232px;
  flex: 1;

  .info-h {
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

  .info-c {
    width: 100%;
    overflow: hidden;
    font-size: 14px;
    margin-top: 3px;
    color: #f7f7f7;
    word-break: break-all;
    user-select: all;
    cursor: auto;
  }
}
</style>
