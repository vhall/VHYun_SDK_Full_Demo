<template>
  <div class="userBox">
    <div class="userCont">
      <div class="userInfo"
           v-for="user in userList"
           :key="user.userId"
           :data-userId="user.userId"
           :data-identity="user.identity"
           :data-imDisable="user.imDisable"
           :data-invaBlack="user.invaBlack"
           :data-inInva="user.inInva"
           :data-streamId="user.streamId"
           :data-invaRequest="user.invaRequest"
           :class="{ black: active === '黑名单' }">
        <div class="user-left">
          <div class="infoImg" :style="{ backgroundColor: user.bg, backgroundImage: user.avatar ? `url(${user.avatar})` : '' }">
            {{ user.title }}
          </div>
          <span
            class="title"
            v-if="user.identity && user.identity !== IDENTITY.player"
            :style="{ color: IDENTITY_COLORS[user.identity][0], backgroundColor: IDENTITY_COLORS[user.identity][1] }"
          >{{ IDENTITY_NAME[user.identity] || IDENTITY_NAME.player }}</span>
          <span class="name" :title="user.nickName">{{ user.nickName || user.userId }}</span>
        </div>

        <!--观众（嘉宾） 操作菜单 只有上麦申请-->
        <div class="user-right" v-if="!hasOpIdentity">
          <span class="ty op" :class="{ disable: disable.invaApply }" v-show="isMe(user.userId) && livein && !userIsPlayer(user.userId) && !hasMeStreamPublish" @click="invaApply(user.userId)">上麦</span>
          <span class="ty op" v-show="isMe(user.userId) && hasMeStreamPublish" @click="invaUnpublish(user.userId)">下麦</span>
        </div>

        <!--主播（助手）(黑名单) 操作菜单-->
        <div class="user-right" v-if="hasOpIdentity && active === '黑名单'">
          <!--目前无法踢出观众-->
          <span class="ty tx op big" @click="invaUnKickRoom(user.userId)">取消踢出</span>
        </div>

        <!--非黑名单 操作菜单-->
        <!--不可操作自己-->

        <!--主播（助手）(非黑名单) 操作菜单-->
        <div class="user-right" v-if="hasOpIdentity && active !== '黑名单' && !(isMe(user.userId) || userHasOp(user.userId))">
          <!--被踢出的用户不能 同意/拒绝/邀请，理论上是不会出现这种用户在互动房间的-->
          <span class="ty op" @click="invaAgree(user.userId)" v-show="!userIsInvaDisable(user.userId) && userIsInvaReq(user.userId)">同意</span>
          <span class="ty op" @click="invaRefuse(user.userId)" v-show="!userIsInvaDisable(user.userId) && userIsInvaReq(user.userId)">拒绝</span>
          <span class="ty op" @click="invaInvitation(user.userId)" v-show="!userIsInvaDisable(user.userId) && livein && !userIsInvaReq(user.userId) && !userIsPlayer(user.userId) && !userIsInvaStream(user.userId)">邀请</span>
          <!-- 管理用户，让用户下麦 -->
          <span class="ty op" @click="invaKickStream(user.userId)" v-show="userIsInvaStream(user.userId)">下麦</span>
          <!--更多 操作菜单-->
          <i class="iconfont iconicon-gengduo">
            <div class="setBox">
              <div @click="setUserDisable(user.userId, false)" v-show="userIsImDisable(user.userId)">解除禁言</div>
              <div @click="setUserDisable(user.userId, true)" v-show="!userIsImDisable(user.userId)">聊天禁言</div>
              <div @click="invaUnKickRoom(user.userId)" v-show="userIsInvaDisable(user.userId)">取消踢出</div>
              <div @click="invaKickRoom(user.userId)" v-show="!userIsInvaDisable(user.userId)">踢出房间</div>
            </div>
          </i>
        </div>
      </div>
    </div>
    <div class="userBoxFooter" v-show="hasOpIdentity">
      <div class="onlineNum">
        <span>{{ onlineNumber }}人在线</span>
        <i class="iconfont iconicon-shuaxin shuaxin" @click="shuaxin" title="刷新"></i>
      </div>
      <div class="btn_group">
        <div v-for="item in filterArr" :key="item" class="userFilterItem" :class="{ active: item === active, dot: item === '申请列表' && reqDot }" @click="filterClick(item)">
          {{ item }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  IDENTITY_NAME,
  IDENTITY,
  userFirstStr,
  promisify,
  IDENTITY_COLORS,
  randomHashColor,
  USER_LIST_SORT_WIDTH,
  wait
} from '@/utils'
import * as api from '@/common/api'
export default {
  name: 'UseruserBox',
  components: {},
  data: function() {
    return {
      IDENTITY: IDENTITY,
      IDENTITY_NAME: IDENTITY_NAME,
      IDENTITY_COLORS: IDENTITY_COLORS,
      filterArr: ['全部', '申请列表', '黑名单'],
      active: '全部',
      disable: {
        // 防止无限点击申请上麦刷屏
        invaApply: false,
      }
    }
  },
  mounted() {
  },
  methods: {
    // 刷新在线人数
    shuaxin() {
      this.$store.dispatch('getOnlineImUserNumber')
    },
    filterClick(item) {
      this.active = item
      // 点击"申请列表"，取消请求列表小红点
      if (item === '申请列表') this.$store.commit('clearRedDotInvaRequest')
    },

    // region 用户操作
    // 申请上麦
    async invaApply(userId) {
      // TODO 纯观众，没有初始化互动sdk，通过自定义消息申请上麦
      // if (this.identity === IDENTITY.player) {
      // eslint-disable-next-line
      if (false) {
        if (!this.chat) return
        const data = {
          type: 'request_inva',
          userId: this.meId,
          context: this.$store.state.user,
        }
        this.disable.invaApply = true
        const res = await promisify(this.chat, this.chat.emitCustomMsg, true)(data)
        this.disable.invaApply = true
        if (res instanceof Error) {
          this.$message.info('申请上麦操作失败')
        } else {
          this.$message.info('已申请上麦')
        }
      } else {
        // 嘉宾通过互动sdk请求上麦
        if (!this.rtc) return
        this.disable.invaApply = true
        const res = await promisify(this.rtc, this.rtc.apply, true)({})
        if (res instanceof Error) {
          this.$message.info('申请上麦操作失败')
        } else {
          this.$message.info('已申请上麦')
        }
      }

      // 等几秒才能再次点击
      await wait(3000)
      this.disable.invaApply = false
    },
    // 下麦 (自己)
    async invaUnpublish(userId) {
      if (!this.rtc) return
      this.$store.dispatch('unpublish')
    },
    // 同意上麦的申请
    async invaAgree(userId) {
      if (!this.rtc) return
      const res = await new Promise((resolve, reject) => this.rtc.consentApply({userId}, resolve, reject)).catch(e => e)
      if (res instanceof Error) return this.$message.error('同意上麦申请操作失败')
      this.$message.info('已同意上麦申请')
    },
    // 拒绝上麦的申请
    async invaRefuse(userId) {
      if (!this.rtc) return
      const res = await new Promise((resolve, reject) => this.rtc.rejectApply({userId}, resolve, reject)).catch(e => e)
      if (res instanceof Error) return this.$message.error('拒绝上麦申请操作失败')
      this.$message.info('已拒绝上麦申请')
    },
    // 邀请用户上麦
    async invaInvitation(userId) {
      if (!this.rtc) return
      const res = await new Promise((resolve, reject) => this.rtc.invite({userId}, resolve, reject)).catch(e => e)
      if (res instanceof Error) return this.$message.error('邀请用户上麦操作失败')
      this.$message.info('已邀请用户上麦')
    },
    // 让用户下麦
    async invaKickStream(userId) {
      if (!this.rtc) return
      // 让用户下麦 (暂不支持直接踢出流，要做自定义消息)\
      const user = this.$store.state.user
      await api.invaStreamDown(this.$store.state.room.roomId, user.identity, user.userId, userId)
    },
    // 踢出房间 (黑名单，并踢出)
    async invaKickRoom(userId) {
      if (!this.rtc) return
      await new Promise((resolve, reject) => this.rtc.addBlackList({ userId }, resolve, reject))
      await api.roomKickUser(this.$store.state.room.roomId, userId)
      // this.$store.commit('addInvaBlackUserSet', userId)
    },
    // 取消踢出房间 (并取消黑名单)
    async invaUnKickRoom(userId) {
      if (!this.rtc) return
      // suck !!!
      await api.roomUnKickUser(this.$store.state.room.roomId, userId)
      await new Promise((resolve, reject) => this.rtc.removeBlackList({ userId }, resolve, reject))
      this.$store.commit('removeInvaBlackUserSet', userId)
    },
    // 设置用户禁言状态
    async setUserDisable(userId, imDisable) {
      if (!this.chat) return
      let info = null
      let type = null
      if (!imDisable) {
        info = '解除禁言成功'
        type = window.VhallChat.TYPE_PERMIT
      } else {
        info = '禁言成功'
        type = window.VhallChat.TYPE_DISABLE
      }
      const res = await promisify(this.chat, this.chat.setDisable)({type, targetId: userId}).catch(e=>e)
      if (res instanceof Error) {
        console.error(res)
      } else {
        this.$message.info(info)
      }
    },
    // endregion 用户操作

    // ************** //
    // region 用户状态判断
    isMe(userId) {
      return userId === this.$store.state.user.userId
    },
    // 用户是否被禁言
    userIsImDisable(userId) {
      const user = this.$store.state.userMap[userId]
      return user?.imDisable
    },
    // 用户是否被踢出
    userIsInvaDisable(userId) {
      const user = this.$store.state.userMap[userId]
      return user?.invaBlack
    },
    // 是否有申请上麦 （且不在麦上）
    userIsInvaReq(userId) {
      const user = this.$store.state.userMap[userId]
      return !(user?.streamId) && user?.invaRequest
    },
    // 是否有在麦上
    userIsInvaStream(userId) {
      const user = this.$store.state.userMap[userId]
      return user?.streamId
    },
    // 权限是观众
    userIsPlayer(userId) {
      const user = this.$store.state.userMap[userId]
      return !user?.identity || user?.identity === IDENTITY.player
    },
    userHasOp(userId) {
      const user = this.$store.state.userMap[userId]
      return user?.identity === IDENTITY.master || user?.identity === IDENTITY.helper
    }
    // endregion 用户状态
  },
  computed: {
    rtc() {
      return this.$store.state.sdk.$rtc
    },
    chat() {
      return this.$store.state.sdk.$chat
    },
    reqDot() {
      return this.$store.state.redDotInvaRequest
    },
    // 当前用户身份
    identity() {
      return this.$store.state.user.identity
    },
    hasOp() {
      return this.identity === IDENTITY.master || this.identity === IDENTITY.helper
    },
    // 是否有用户管理权限
    hasOpIdentity () {
      return this.identity === IDENTITY.master || this.identity === IDENTITY.helper
    },
    // 黑名单用户列表
    userBlackList() {
      const list = []
      const state = this.$store.state
      const invaBlackUserSet = state.invaBlackUserSet
      for (const userId of Object.keys(invaBlackUserSet)) {
        if (!invaBlackUserSet[userId]) continue
        const user = state.userMap[userId]
        if (!user.title) user.title = userFirstStr(user)
        if (!user.bg) user.bg = randomHashColor(user.userId)
        list.push(user)
      }
      return list
    },
    // 在线用户
    userOnlineList() {
      const list = []
      const state = this.$store.state
      const imUserList = state.imUserList
      for (const item of imUserList) {
        const user1 = state.userMap[item.userId]
        const user = {
          ...item,
          ...user1,
        }
        if (!user.title) user.title = userFirstStr(user)
        if (!user.bg) user.bg = randomHashColor(user.userId)
        list.push(user)
      }
      return list
    },
    // 用户列表
    userList() {
      // 黑名单
      if (this.active === '黑名单') return this.userBlackList
      let list = this.userOnlineList
      if (this.active === '申请列表') {
        list = this.userOnlineList.filter(i => i.invaRequest)
      }
      // 非黑名单
      const sortList = list.sort((a, b) => (USER_LIST_SORT_WIDTH[b.identity] || 0) - (USER_LIST_SORT_WIDTH[a.identity] || 0))
      return sortList
    },
    // 在线人数
    onlineNumber() {
      return this.$store.state.imOnlineUserTotal || 1
    },
    // 我的id
    meId() {
      return this.$store.state.user.userId
    },
    // 是否有在推流（在麦上）(自己)
    hasMeStreamPublish() {
      return !!this.$store.state.stream.local
    },
    livein() {
      return this.$store.state.live
    }
  },
  watch: {
  }
}
</script>

<style lang="less" scoped>
.userBox {
  display: flex;
  flex-direction: column;
  height: 100%;
  .userCont {
    min-height: 400px;
    will-change: transform;
    overflow-x: hidden;
    overflow-y: auto;
    height: calc(~'100vh - 353px');
    padding: 0px 16px 20px;
    box-sizing: border-box;
    flex: 1;
    .userInfo {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      margin-top: 16px;
      justify-content: space-between;
      .user-left {
        display: flex;
        width:188px;
        //width:176px;
        overflow: hidden;
        align-items: center;
        margin-right: 8px;
        .infoImg {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          flex: none;
          background-color: #1e90ff;
          text-align: center;
          line-height: 28px;
          margin-right: 8px;
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
        }
        .title {
          font-size: 12px;
          padding: 0px 6px;
          line-height: 16px;
          height: 16px;
          display: inline-block;
          border-radius: 9px;
          background: rgba(30, 144, 255, 0.3);
          color: #1e90ff;
          word-break: keep-all;
          margin-right: 4px;
        }
        .name {
          color: #999;
          font-size: 14px;
          max-width: 126px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      .user-right {
        width: 86px;
        height: 28px;
        display: flex;
        color: #999;
        align-items: center;
        justify-content: flex-end;

        .ty.op.disable {
          pointer-events: none;
          color: gray;
        }
        .ty.op {
          cursor: pointer;
        }
        .ty.tx {
          width: 46px;
        }
        .ty.tx.big {
          width: 58px;
        }

        .ty {
          word-break: keep-all;
          font-size: 12px;
          width: 34px;
          height: 18px;
          background: #333;
          display: inline-block;
          text-align: center;
          line-height: 18px;
          color: #f7f7f7;
          border-radius: 2px;
          margin-right: 5px;
          margin-top: 1px;
          margin-bottom: 1px;
        }
        > i {
          font-size: 10px;
          cursor: pointer;
          position: relative;
          &:hover {
            .setBox {
              display: block;
            }
          }
          .setBox {
            width: 100px;
            height: 60px;
            position: absolute;
            top: 0px;
            left: -100px;
            background: #fff;
            box-shadow: 0 1px 9px 0;
            border-radius: 4px;
            overflow: hidden;
            display: none;
            &:nth-child(1) {
            }
            > div {
              height: 30px;
              color: #333;
              font-size: 14px;
              text-align: center;
              line-height: 30px;
              cursor: pointer;
              &:hover {
                background: #1e90ff;
                color: #fff;
              }
            }
          }
        }
      }
    }
  }
  .userCont.black {
    .user-left {
      width: 176px;
    }
    .user-right {

    }
  }

  .userFilterItem {
    position: relative;
  }
  .userFilterItem.dot:before {
    content: '\00';
    position: absolute;
    border-radius: 100%;
    width: 6px;
    height: 6px;
    background-color: red;
    top: 2px;
    right: 2px;
    overflow: hidden;
  }

  .userBoxFooter {
    height: 87px;
    background: #252525;
    color: #999;
    padding: 8px 16px 16px;
    box-sizing: border-box;
    flex: none;
    .onlineNum {
      font-size: 12px;
    }
    .shuaxin {
      margin-left: 5px;
      font-size: 10px;
      cursor: pointer;
    }
    .btn_group {
      width: 222px;
      margin-top: 10px;
      height: 30px;
      background: #363636;
      font-size: 12px;
      display: flex;
      border-radius: 3px;
      overflow: hidden;
      cursor: pointer;
      > div {
        box-sizing: border-box;
        width: 74px;
        text-align: center;
        line-height: 30px;
        color: #cacaca;
        &:nth-child(2) {
          border-left: 1px solid #111;
          border-right: 1px solid #111;
        }
        &.active {
          background: #1e90ff;
          color: #fff;
        }
      }
    }
  }
}
</style>
