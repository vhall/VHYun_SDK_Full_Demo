<template>
  <div class="userBox">
    <div class="user-box-cont">
      <div class="user-info-item"
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
          <div class="user-info-img" :style="{ backgroundColor: user.bg, backgroundImage: user.avatarBackgroundImage }">
            {{ user.title }}
          </div>
          <span
            class="title"
            v-if="user.identity && user.identity !== IDENTITY.player"
            :style="{ color: user.identityColors[0], backgroundColor: user.identityColors[1] }"
          >{{ user.identityName }}</span>
          <span class="name" :title="user.nickName">{{ user.nickName || user.accountId }}</span>
        </div>

        <!--观众/嘉宾 操作菜单 只有上麦申请-->
        <div data-left="1" class="user-right" data-type="1" v-if="!hasOp">
          <span class="ty op" :class="{ disable: user.invaApply }"
                v-show="isMe(user.accountId) && livein && !hasMeStreamPublish"
                @click="invaApply(user.accountId)">上麦</span>
          <span class="ty op" v-show="isMe(user.accountId) && hasMeStreamPublish"
                @click="invaUnpublish(user.accountId)">下麦</span>
        </div>

        <!--主播/助手 (黑名单) 操作菜单-->
        <div data-left="2" class="user-right" data-type="2" v-if="hasOp && active === '黑名单'">
          <!--目前无法踢出观众-->
          <span class="ty tx op big" @click="invaUnKickRoom(user.accountId)">取消踢出</span>
        </div>

        <!--非黑名单 操作菜单-->
        <!--不可操作自己-->

        <!--主播/助手 (非黑名单) 操作菜单-->
        <div data-left="3" class="user-right" data-type="3"
             v-if="hasOp && active !== '黑名单' && !(isMe(user.accountId) || userHasOp(user.accountId))">
          <!--被踢出的用户不能 同意/拒绝/邀请，理论上是不会出现这种用户在互动房间的-->
          <span class="ty op" @click="invaAgree(user.accountId)"
                v-show="!userIsInvaDisable(user.accountId) && userIsInvaReq(user.accountId)">同意</span>
          <span class="ty op" @click="invaRefuse(user.accountId)"
                v-show="!userIsInvaDisable(user.accountId) && userIsInvaReq(user.accountId)">拒绝</span>
          <span class="ty op" @click="invaInvitation(user.accountId)"
                v-show="!userIsInvaDisable(user.accountId) && livein && !userIsInvaReq(user.accountId) && !userHasOp(user.accountId) && !userIsInvaStream(user.accountId) && !user.invaInviter">邀请</span>
          <span class="ty op disable"
                v-show="!userIsInvaDisable(user.accountId) && livein && !userIsInvaReq(user.accountId) && !userHasOp(user.accountId) && !userIsInvaStream(user.accountId) && user.invaInviter">已邀请</span>
          <!-- 管理用户，让用户下麦 -->
          <span class="ty op" @click="invaKickStream(user.accountId)"
                v-show="userIsInvaStream(user.accountId)">下麦</span>
          <!--更多 操作菜单-->
          <i class="iconfont iconicon-gengduo">
            <div class="setBox">
              <div @click="setUserDisable(user.accountId, !userIsImDisable(user.accountId))">{{ userIsImDisable(user.accountId) ? '解除禁言' : '聊天禁言' }}</div>
              <!-- <div @click="setUserDisable(user.accountId, true)" v-show="!userIsImDisable(user.accountId)">聊天禁言</div> -->
              <!-- <div @click="invaUnKickRoom(user.accountId)" v-show="userIsInvaDisable(user.accountId)">取消踢出</div> -->
              <div @click="invaKickRoom(user.accountId)">踢出房间</div>
            </div>
          </i>
        </div>
      </div>
    </div>
    <div class="userBoxFooter" v-show="hasOp">
      <div class="onlineNum">
        <span>{{ onlineNumber }}人在线</span>
        <i class="iconfont iconicon-shuaxin shuaxin" @click="shuaxin" title="刷新"></i>
      </div>
      <div class="btn_group">
        <div v-for="item in filterArr" :key="item" class="userFilterItem"
             :class="{ active: item === active, dot: item === '申请列表' && reqDot }" @click="filterClick(item)">
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
  IDENTITY_COLORS,
  randomHashColor,
  USER_LIST_SORT_WIDTH,
  wait, isSecure
} from '@/utils'
import {BUS_CUSTOM_EVENTS, BUS_LOCAL_EVENTS} from '@/common/contant'

export default {
  name: 'UseruserBox',
  components: {},
  data: function () {
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
    const cb = (ev) => {
      if (!ev) return
      if (ev.resource === 'kick') {
        this.$store.dispatch('getKickList')
      } else if (ev.resource === 'inav') {
        this.$store.dispatch('getInavList')
      }
    }
    this.$root.$on(BUS_LOCAL_EVENTS.RESOURCE_CHANGE, cb)
    this.$once('hook:beforeDestroy', () => this.$root.$off(BUS_LOCAL_EVENTS.RESOURCE_CHANGE, cb))
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
    async invaApply() {
      if (!isSecure()) return this.$message.error('无法使用互动工具，请使用https访问')
      this.disable.invaApply = true
      try {
        await this.$store.dispatch('inavRequest', {})
        this.$message.info('已申请上麦')
      } catch (e) {
        this.$message.error('申请上麦失败')
        this.disable.invaApply = false
      }
      // 等几秒才能再次点击
      await wait(3000)
      this.disable.invaApply = false
    },
    // 同意上麦的申请
    async invaAgree(userId) {
      await this.$store.dispatch('inavRequestCallback', {userId, status: 1})
      this.$store.commit('setInvaRequestStat', {userId, stat: false})
      this.$message.info('已同意上麦申请')
    },
    // 拒绝上麦的申请
    async invaRefuse(userId) {
      await this.$store.dispatch('inavRequestCallback', {userId, status: 2})
      this.$store.commit('setInvaRequestStat', {userId, stat: false})
      this.$message.info('已拒绝上麦申请')
    },
    // 邀请用户上麦
    async invaInvitation(userId) {
      await this.$store.dispatch('inavInviter', {userId})
      this.$message.info('已邀请用户上麦')
    },
    // 让用户下麦
    async invaKickStream(userId) {
      await this.$store.dispatch('inavDown', {userId})
    },
    // 设置用户禁言状态
    async setUserDisable(userId, imDisable) {
      await this.$store.dispatch('setUserMute', {accounts: [userId], mute: imDisable})
    },
    // 踢出房间 (黑名单，并踢出)
    async invaKickRoom(userId) {
      await this.$store.dispatch('setUserKick', {userId, kick: true})
    },
    // 取消踢出房间 (并取消黑名单)
    async invaUnKickRoom(userId) {
      await this.$store.dispatch('setUserKick', {userId, kick: false})
    },
    // 下麦自己(非支持人)
    async invaUnpublish(userId) {
      this.$parent.$parent.$bus.emit(BUS_CUSTOM_EVENTS.DOWN, {})
    },
    // endregion 用户操作

    // ************** //
    // region 用户状态判断
    isMe(userId) {
      return userId === this.$store.state.user.accountId
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
      return this.$store.getters.rtc
    },
    chat() {
      return this.$store.getters.chat
    },
    reqDot() {
      return this.$store.state.redDotInvaRequest
    },
    // 当前用户身份
    identity() {
      return this.$store.getters.identity
    },
    // 是否有用户管理权限
    hasOp() {
      return this.$store.getters.hasOp
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
      return this.$store.state.imUserList.length || 1
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
      return this.$store.getters.livein
    }
  },
  watch: {}
}
</script>

<style lang="less" scoped>
.userBox {
  display: flex;
  flex-direction: column;
  height: 100%;

  .user-box-cont {
    min-height: 400px;
    will-change: transform;
    overflow-x: hidden;
    overflow-y: auto;
    height: calc(~'100vh - 353px');
    padding: 0px 16px 20px;
    box-sizing: border-box;
    flex: 1;

    &::-webkit-scrollbar {
      width: 0px;
      height: 0px;
      background-color: rgba(0, 0, 0, 0);
    }

    /*定义滚动条轨道 内阴影+圆角*/

    &::-webkit-scrollbar-track {
      box-shadow: inset 0 0 0 rgba(240, 240, 240, 0.5);
      border-radius: 10px;
      background-color: rgba(240, 240, 240, 0.5);
    }

    /*定义滑块 内阴影+圆角*/

    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      box-shadow: inset 0 0 0 rgba(240, 240, 240, 0.5);
      background-color: rgba(240, 240, 240, 0.5);
    }

    .user-info-item {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      margin-top: 16px;
      justify-content: space-between;

      .user-left {
        display: flex;
        width: 188px;
        //width:176px;
        overflow: hidden;
        align-items: center;
        margin-right: 8px;

        .user-info-img {
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

        .iconicon-gengduo:hover {
          color: white;
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

  .user-box-cont.black {
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
