<template>
  <div class="message-item-info" :data-msgid="msg.msgId" :data-userid="msg.sourceId" :data-identity="user.identity">
    <div class="info-img" :style="{ backgroundColor: user.avatarBackgroundColor, backgroundImage: user.avatarBackgroundImage }">
      {{ user.nickNameTitle }}
    </div>
    <div class="info-cont">
    </div>
  </div>
</template>

<script>

export default {
  name: 'OtherMessageItem',
  data() {
    return {
    }
  },
  props: {
    msg: Object,
    user: Object,
  },
  computed: {},
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
</style>
