<template>
  <div class="home">
    <div class="content">
      <div class="item-ig repository" :class="{ haveCreate }">
        <a class="" :href="repository">
          <svg class="octicon" height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true"><path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
        </a>
      </div>
      <div class="item-ig">
        <div class="title">加入房间</div>
      </div>
      <form>
        <div class="item-ig">
          <label for="roomName" class="none">房间名</label>
          <input id="roomName" v-model.trim="roomName" :disabled="!!roomId" name="roomName" type="text" placeholder="请输入房间名">
        </div>
        <div class="item-ig">
          <label for="username" class="none">昵称</label>
          <input id="username" v-model.trim="username" name="username" type="text" placeholder="请输入昵称">
        </div>
        <div class="item-ig identity">
          <input id="master" name="identity" type="radio" :value="IDENTITY.master" v-model="identity">
          <label for="master" v-show="haveCreate"><span></span>{{IDENTITY_NAME.master}}</label>

          <input id="guest" name="identity" type="radio" :value="IDENTITY.guest" v-model="identity">
          <label for="guest" ><span></span>{{IDENTITY_NAME.guest}}</label>

          <input id="helper" name="identity" type="radio" :value="IDENTITY.helper" v-model="identity">
          <label for="helper"><span></span>{{IDENTITY_NAME.helper}}</label>

          <input id="player" name="identity" type="radio" :value="IDENTITY.player" v-model="identity">
          <label for="player"><span></span>{{IDENTITY_NAME.player}}</label>
        </div>
        <div class="item-ig">
          <button type="submit" @click.prevent="enter" @submit.prevent="enter">加入房间</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import {checkBrowserEnv, IDENTITY, IDENTITY_NAME, localStoragePrefix, VH_TITLE, wait} from '@/utils'
import * as api from '@/common/api'

export default {
  name: 'Home',
  components: {},
  data: () => ({
    IDENTITY: IDENTITY,
    IDENTITY_NAME: IDENTITY_NAME,
    repository: require('../../../package.json').repository,
    haveCreate: false,
    roomName: '',
    username: '',
    roomId: '',
    identity: IDENTITY.guest,
  }),
  mounted(){
    // 如果查询参数有roomId，说明是点击去观看过来的
    // 此时检查该房间是否有效，如果期间输入被改过，则取消
    const roomId = this.$route.query.roomId
    if (roomId) {
      this.haveCreate = !roomId
      this.initCheck({roomId})
      .then(data => {
        if (!data) return
        if (this.roomId || this.roomName || this.username) return
        if (data.username) this.username = data.username
        this.roomName = data.title
        this.roomId = data.roomId
      })
    } else {
      this.haveCreate = true
      window.document.title = VH_TITLE
    }

    // 由于是在同一个浏览器不同tab，所以需要清理数据，避免有影响
    this.$store.dispatch('cleanRestoreInvaData')
    this.$store.dispatch('cleanInvaRequest')
    this.$store.commit('resetRoomData')

    this.identity = this.haveCreate ? IDENTITY.master : IDENTITY.guest
  },
  methods: {
    async enter() {
      // 检查浏览器环境
      const check = checkBrowserEnv()
      if (check) return this.$message.error(check)

      let roomId = this.roomId
      if (!this.roomName) return !this.$message.info('房间名不允许为空')
      if (!this.username) return !this.$message.info('昵称不允许为空')
      if (!this.identity) return !this.$message.info('请选择身份')
      if (this.roomName.length > 20) return !this.$message.info('房间名不允许大于20个字符')
      if (this.username.length > 20) return !this.$message.info('昵称不允许大于20个字符')
      if (!roomId) {
        const option = {
          title: this.roomName,
          username: this.username,
          identity: this.identity
        }
        let detect
        let bc
        // 检测其他页面直播中
        if (typeof BroadcastChannel !== 'undefined') {
          bc = new BroadcastChannel(localStoragePrefix)
          bc.addEventListener('message', function (ev) {
            if (ev && ev.data && ev.data.type === 'ack') detect = ev.data
          })
          bc.postMessage('detect')
          await wait(100)
          bc.close()
        }

        if (this.identity === IDENTITY.master) {
          // 创建
          const data = await this.createRoom(option).catch((e) => e)
          if (data instanceof Error) return !this.$message.error(data.message || '创建互动房间失败')
          roomId = data.roomId
          if (detect && detect.live) {
            return !this.$message.error('其他页面正在进行直播中')
          }
          if (detect && detect.room?.roomId === roomId) {
            return !this.$message.error('主持人已在直播间')
          }
        } else {
          const res = await this.initCheck({ title: option.title, roomId: this.roomId })
          if (res instanceof Error) return !this.$message.error(res.message || '创建互动房间失败')
          if (!res) return !this.$message.error('请检查这个房间是否存在')
          roomId = res.roomId
        }
        if (!roomId) return !this.$message.error('进入互动房间失败')
      }

      try {
        // 请求加入互动数据，并设置房间需要的数据
        await this.$store.dispatch('execEnterRoom', { roomId, identity: this.identity, username: this.username })
        // 跳转到互动主页面
        await this.$nextTick()
        this.$router.replace('/main')
      } catch (e) {
        this.$message.error(e.message || '进入互动房间失败')
      }

      return false
    },
    // 创建一个互动房间
    async createRoom(option) {
      const data = await api.roomCreate(option.title, option.username, option.identity)

      return {
        roomId: '' + (data.id ?? ''),
        paasLiveId: data.paasLiveId,
        paasInavId: data.paasInavId,
        paasImId: data.paasImId,
        roomName: data.title,
      }
    },
    // 检查是否存在room用来恢复
    async initCheck({ roomId, title }) {
      const data = await api.roomInit(title, roomId).catch((e) => e)
      if (data instanceof Error) return
      if (!data?.roomId) return
      return {
        title: data.title,
        username: data.username || '',
        roomId: '' + (data.roomId || ''),
      }
    },
  },
  watch: {
    'roomName': function () {
      if (!this.haveCreate) return
      this.roomId = ''
    }
  }
}
</script>

<style lang="less" scoped>
.home {
  width: 100%;
  height: 100%;
  background: #f4f8fe;
  display: flex;
  align-items: center;
  justify-content: center;
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
