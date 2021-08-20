<template>
  <div class="home-enter-select">
    <div v-show="type===0" class="enter-select">
      <h1>选择您要进行的操作</h1>
      <div class="select-box" @click="selectType(1)">发起直播</div>
      <div class="select-box" @click="selectType(2)">加入直播</div>
      <div class="select-box" @click="selectType(3)">观看点播</div>
    </div>
    <div v-show="type===1||type===2||type===3" class="login">
      <div class="content">
        <div class="item-ig repository" :class="{ haveCreate }">
          <a class="" :href="repository">
            <svg class="octicon" height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true">
              <path fill-rule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
          </a>
        </div>
        <div class="item-ig">
          <div class="title">{{ title }}</div>
        </div>
        <form>
          <div class="item-ig">
            <label for="roomName" class="none">房间名</label>
            <input id="roomName" v-model.trim="roomName" :disabled="!!roomId" name="roomName" type="text"
                   placeholder="请输入房间名">
          </div>
          <div class="item-ig">
            <label for="nickName" class="none">昵称</label>
            <input id="nickName" v-model.trim="nickName" name="nickName" type="text" placeholder="请输入昵称">
          </div>
          <div class="item-ig identity" v-show="type===1||type===2">
            <div style="display: inline-block">
              <input id="master" name="identity" type="radio" :value="IDENTITY.master" v-model="identity">
              <label for="master" :disabled="type!==1"><span></span>{{ IDENTITY_NAME.master }}</label>
            </div>

            <div style="display: inline-block">
              <input id="guest" name="identity" type="radio" :value="IDENTITY.guest" v-model="identity">
              <label for="guest" :disabled="type===1"><span></span>{{ IDENTITY_NAME.guest }}</label>
            </div>

            <div style="display: inline-block">
              <input id="helper" name="identity" type="radio" :value="IDENTITY.helper" v-model="identity">
              <label for="helper" :disabled="type===1"><span></span>{{ IDENTITY_NAME.helper }}</label>
            </div>

            <div style="display: inline-block">
              <input id="player" name="identity" type="radio" :value="IDENTITY.player" v-model="identity">
              <label for="player" :disabled="type===1"><span></span>{{ IDENTITY_NAME.player }}</label>
            </div>
          </div>
          <div class="item-ig">
            <button type="submit" @click.prevent="enter" @submit.prevent="enter">
              {{ type === 1 ? '发起直播' : type === 2 ? '加入房间' : '观看点播' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import {checkBrowserEnv, IDENTITY, IDENTITY_NAME, localStoragePrefix, VH_TITLE, wait} from '@/utils'
import * as api from '@/common/api'
import {inavApi, roomApi} from '@/common/api'
import {BUS_LOCAL_EVENTS} from '@/common/contant'
import VhDialog from '@/components/Modal'
import ConfirmDialogCtor from '@/components/Modal/components/confirm'
import querystring from 'querystring'

export default {
  name: 'Home',
  components: {},
  computed: {
    title() {
      if (this.type === 1) return '创建直播'
      if (this.type === 2) return '加入房间'
      if (this.type === 3) return '观看点播'
      return ''
    }
  },
  data: () => {
    const qs = querystring.parse(location.search.slice(1))
    let type = Number(qs.type) || 0
    if (type !== 1 && type !== 2 && type !== 3) type = 0

    return ({
      IDENTITY: IDENTITY,
      IDENTITY_NAME: IDENTITY_NAME,
      repository: require('../../../package.json').repository,
      haveCreate: false,
      roomName: '',
      nickName: '',
      roomId: '',
      identity: IDENTITY.guest,
      type,
    })
  },
  mounted() {
    // 如果查询参数有roomId，说明是点击去观看过来的
    // 此时检查该房间是否有效，如果期间输入被改过，则取消
    const roomId = this.$route.query.roomId
    const title = this.$route.query.title
    window.document.title = VH_TITLE
    window.token = null

    if (this.type !== 0 && roomId) {
      if (this.type === 2) {
        this.initRoomInfoFormQuery({roomId, title})
      } else if (this.type === 3) {
        this.initRoomVodInfoFormQuery({roomId, title})
      }
    }

    if (this.type !== 0 && !roomId) {
      //
    }

    this.identity = this.type === 1 ? IDENTITY.master : IDENTITY.guest
    // 由于是在同一个浏览器不同tab，所以需要清理数据，避免有影响
    if (this.$store) this.$store.commit('resetRoomData')
  },
  methods: {
    selectType(type) {
      this.type = type
      this.$router.push({query: {type: type}})
      if (type === 1) this.identity = IDENTITY.master
      else if (type === 2) this.identity = IDENTITY.guest
    },
    async enter() {
      // 检查浏览器环境
      const check = checkBrowserEnv()
      if (check) return this.$message.error(check)
      if (!this.roomName) return !this.$message.info('房间名不允许为空')
      if (!this.nickName) return !this.$message.info('昵称不允许为空')
      if (this.roomName.length > 20) return !this.$message.info('房间名不允许大于20个字符')
      if (this.nickName.length > 20) return !this.$message.info('昵称不允许大于20个字符')
      if (this.type === 1) {
        if ((/^\d+$/).test(this.roomName)) return !this.$message.error('房间名不允许使用纯数字')
        return this._enterLive({
          roomId: this.roomId,
          title: this.roomName,
          nickName: this.nickName,
          identity: this.identity
        })
      }
      if (this.type === 2) return this._enterLive({
        roomId: this.roomId,
        title: this.roomName,
        nickName: this.nickName,
        identity: this.identity
      })
      if (this.type === 3) return this._enterVod({
        roomId: this.roomId,
        title: this.roomName,
        nickName: this.nickName,
      })
    },
    // 进入回放
    async _enterVod(option) {
      let roomId = option.roomId
      if (!roomId) {
        try {
          const rs = await api.roomApi.login(option.nickName)
          window.token = rs.token
          const info = await roomApi.infoVod(option.title, roomId)
          roomId = info.roomId
        } catch (e) {
          return this.$message.error(e.message)
        }
      }
      if (!roomId) return this.$message.info('房间不存在')
      this._jumpToVodRoom(roomId, this.nickName, IDENTITY.player, false)
    },
    // 进入直播
    async _enterLive(option) {
      let roomId = option.roomId
      if (!option.identity) return !this.$message.info('请选择身份')

      // 暂不支持火狐提示（互动工具）
      if (option.identity === IDENTITY.master || option.identity === IDENTITY.helper) {
        if (navigator.userAgent.indexOf('Firefox/') > 0) {
          return this.$message.error('互动工具暂不支持火狐')
        }
      }

      if (!roomId) {
        // 创建
        try {
          const room = await this._getOrCreateRoom(option)
          roomId = room && room.roomId
          if (room.type === 2) {
            this.$message.error('该房间已作为纯音频推流创建，此demo暂不支持')
            return false
          }

          // 已结束
          // if (room.status === 4) {
          //   option.roomId = roomId
          //   this._roomEndTip(room, option)
          //   return false
          // }
        } catch (e) {
          this.$message.error(e.message || '创建/进入互动房间失败')
          return false
        }
        if (!roomId) {
          this.$message.error('互动房间不存在或已删除')
          return false
        }
      }

      await this._jumpToRoom(roomId, option.nickName || this.nickName, option.identity)
      return false
    },
    // 获取 room info
    async initRoomInfoFormQuery({roomId, title}) {
      let rs
      try {
        rs = await api.roomApi.info(title, roomId)
        if (!rs.roomId) return
      } catch (orz) {
        return false
      }

      if (this.roomId || this.roomName || this.nickName) return
      if (rs.randomNickname) this.nickName = rs.randomNickname
      this.roomName = rs.title
      this.roomId = rs.roomId
    },
    // 获取 room info
    async initRoomVodInfoFormQuery({roomId, title}) {
      let rs
      try {
        rs = await api.roomApi.info(title, roomId)
        if (!rs.roomId) return
      } catch (orz) {
        return false
      }

      // 点播还未生成
      if (rs.vod !== 3) return
      if (this.roomId || this.roomName || this.nickName) return
      if (rs.randomNickname) this.nickName = rs.randomNickname
      this.roomName = rs.title
      this.roomId = rs.roomId
    },
    async _roomEndTip(room, option) {
      const vod = room.vod
      const roomId = option.roomId
      const onClose = async (ok) => {
        // 拒绝了
        if (!ok) return
        // 重新开启直播
        await roomApi.reopen(roomId)
        // 跳转进入到直播
        await this._jumpToRoom(roomId, option.nickName || this.nickName, option.identity, true)
      }

      const onCloseVod = async (ok) => {
        // 拒绝了
        if (!ok) return
        // 跳转进入到直播
        await this._jumpToVodRoom(roomId, option.nickName || this.nickName)
      }

      if (vod === 3) {
        const opt = {title: '提示', content: '该直播间直播已结束，且已生成录播，是否去观看录播？', onCloseVod}
        VhDialog.open(ConfirmDialogCtor, this, opt)
        return
      }

      const opt = {title: '提示', content: '该直播间直播已结束，是否重新开启直播？', onClose}
      VhDialog.open(ConfirmDialogCtor, this, opt)
    },
    // 创建一个互动房间
    async _getOrCreateRoom(option) {
      if (this.identity === IDENTITY.master) {
        const rs = await api.roomApi.login(option.nickName)
        window.token = rs.token
        const data = await api.roomApi.create(1, option.title, option.nickName, option.identity)
        return data
      }

      const rs = await roomApi.info(option.title, option.roomId)
      return rs
    },
    // 进入房间
    async _jumpToRoom(roomId, nickName, identity, isNew) {
      try {
        // 跳转到互动主页面
        const vtypes = {
          [IDENTITY.master]: 'publisher',
          [IDENTITY.helper]: 'helper',
          [IDENTITY.guest]: 'watcher',
          [IDENTITY.player]: 'watcher'
        }
        const query = {nickName, panelist: identity === IDENTITY.guest ? '1' : undefined, isNew}
        const name = vtypes[identity] === 'watcher' ? 'watcher' : 'main'
        await this.$router.push({name, params: {vtype: vtypes[identity], roomId}, query})
      } catch (e) {
        this.$message.error('进入互动房间失败')
        roomApi.report(roomId, '进入互动房间失败')
      }
    },
    // 进入点播
    async _jumpToVodRoom(roomId, nickName) {
      try {
        const query = {nickName}
        await this.$router.push({name: 'vod', params: {roomId}, query})
      } catch (e) {
        this.$message.error('进入点播房间失败')
        roomApi.report(roomId, '进入点播房间失败')
      }
    },
  },
  watch: {
    'roomName': function () {
      if (!this.haveCreate) return
      this.roomId = ''
    },
    nickName() {
      window.token = null
    },
    $route(to, from) {
      const t = Number(to.query.type) || 0
      if (t === 0 || t === 1 || t === 2 || t === 3) this.type = t
    }
  }
}
</script>

<style lang="less" scoped>
.home-enter-select {
  width: 100%;
  height: 100%;
  display: flex;

  .enter-select {
    margin: auto;
    color: #0c0c0c;
    padding-bottom: 120px;

    h1 {
      font-size: 24px;
      color: black;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }

    .select-box {
      width: 400px;
      height: 100px;
      font-size: 20px;
      background-color: rgba(242, 242, 242, 1);
      margin: 20px 0;
      line-height: 100px;
      text-align: center;
      border-radius: 4px;
      cursor: pointer;
    }

    .select-box:hover {
      background-color: #e2e2e2;
    }
  }
}

.login {
  width: 100%;
  height: 100%;
  background: #f4f8fe;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto;

  .content {
    width: 344px;
    height: 376px;
    background: #fdfdfe;
    box-shadow: 0 10px 29px 0 rgba(9, 44, 78, 0.1);
    padding: 16px 32px 80px;

    .item-ig {
      width: 100%;
      margin-bottom: 16px;
    }

    .repository {
      height: 24px;
      visibility: hidden;

      a {
        float: right;
        float: right;
        position: relative;
        right: -16px;
      }

      .octicon {
        width: 25px;
        height: 28px;
        fill: #666666;
      }
    }

    .repository.haveCreate {
      visibility: visible;
    }

    from {
      margin-top: -2px;
    }

    .title {
      font-family: PingFangSC-Medium, Arial, Sans-serif, Courier, serif, Sana, "Microsoft YaHei";
      font-size: 20px;
      color: #000000;
      letter-spacing: 0;
    }

    label.none {
      display: none;
    }

    .identity {
      font-size: 14px;

      input {
        display: none;
      }

      label {
        span {
          width: 14px;
          height: 14px;
          vertical-align: -2px;
          display: inline-block;
          border: 1px #E2E2E2 solid;
          border-radius: 50%;
          margin-right: 8px;
        }

        color: #666;
        display: inline-block;
        vertical-align: middle;
        margin-right: 16px;
      }

      input:checked + label {
        color: #1E90FF;
      }

      input:checked + label span {
        border: 4px #1E90FF solid;
      }

      label[disabled] {
        pointer-events: none;
        color: #ababab !important;
      }
    }

    input[type="text"] {
      width: 100%;
      height: 40px;
      border: 1px solid #E2E2E2;
      border-radius: 4px;
      padding: 10px;
      color: #333;
    }

    input[type="text"]::placeholder {
      color: #999;
    }

    input[type="text"]::-webkit-input-placeholder {
      color: #999;
    }

    button {
      width: 100%;
      background: #1E90FF;
      border-radius: 4px;
      height: 40px;
      border: none;
      margin-top: 6px;
      color: white;
      outline: none;
    }
  }
}
</style>
