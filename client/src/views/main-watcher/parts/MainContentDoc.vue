<template>
  <div class="MainContent">
    <div id="docFileView" class="docFileView" ref="docFileViewEl">
      <div class="doc-box" ref="docBoxEl" :class="{ hidden: !showDocBox }">
        <!-- 文档容器 -->
        <!-- display:none|block 会影响父级元素和iframe的通信，会导致通信时长延长5s左右，故采用visible -->
        <div v-for="item of fileOrboardList" :id="item.cid" :key="item.cid"
             :class="{ hidden: item.cid !== selectDoc.cid, nosorcll: true }"></div>
        <div class="nodata" v-show="!selectDoc.cid" :class="{ visible: !selectDoc.cid }">
          <img :src="require(`@/assets/images/noFile@3x.png`)" width="100" height="100" alt=""/>
          <span>暂无{{ $store.state.side_active === 'file' ? '文档' : '白板' }}</span>
        </div>
      </div>
    </div>
    <DocOnlyMenu v-if="isVod" :allComplete="allComplete" :selectDoc="selectDoc" :list="fileOrboardList"
                 ref="DocOnlyMenu"/>
  </div>
</template>

<script>
import RlementResizeDetector from 'element-resize-detector'
import DocOnlyMenu from './DocOnlyMenu'
import {IDENTITY, wait, pageIsReload} from '@/utils'
import {initDoc} from '@/utils/sdk'
import {roomReport} from '@/common/api'

export default {
  name: 'MainContentDoc',
  components: {DocOnlyMenu},
  data() {
    return {
      docs: {},
      docViewRect: null,
      vodWatchOpen: false,
      selectDoc: {},
      $doc: null,
      fileOrboardList: [],
      ThumbnailList: [],
      brushActive: null,
      isFirst: true,
      switchStatus: false,
      allComplete: false,
      previewInfo: {
        showPreview: false,
        docId: '',
        slideIndex: 0,
        slidesTotal: 0,
        canOperate: false,
        elId: '',
      },
      brushData: [],
      prevDoc: {
        file: null,
        board: null,
      },
    }
  },
  created() {
    this.$root.$on('startInitDoc', () => {
      this.initDoc()
    })
    this.$root.$on('startPublish', () => {
      this.switchStatus = true
      this.$doc.start(1, 2)
      this.$doc.republish()
      this.$doc.switchOnContainer()
      if (process.env.NODE_ENV !== 'production') console.info(`观众可见已开启`)
    })
    this.$root.$on('stopPublish', () => {
      this.switchStatus = false
      this.$doc.start(2, 2)
      this.$doc.switchOffContainer()
      this.fileOrboardList.forEach(({cid}) => {
        this.$doc.destroyContainer({id: cid})
      })
      this.fileOrboardList = []
      this.selectDoc = {}
      this.prevDoc = {file: null, board: null}
      this.$doc.resetContainer()
    })

    if (this.hasOp || (this.livein && this.$store.state.chat)) this.initDoc()
  },
  mounted() {
    this.resize()
    let erd = RlementResizeDetector()
    let _this = this
    erd.listenTo(_this.$refs.docFileViewEl, _this.resize)
  },
  computed: {
    livein() {
      return this.$store.getters.livein
    },
    hasOp() {
      return this.$store.getters.hasOp
    },
    isVod() {
      return this.$store.getters.isVod
    },
    showDocBox() {
      if (this.hasOp) return true
      const side = this.$store.state.side_active
      if (this.livein && (side === 'file' || side === 'board')) return true
      return this.switchStatus
    },
  },
  methods: {
    resize(e) {
      let {width, height} = this.$refs.docFileViewEl.getBoundingClientRect()
      let w = null,
        h = null
      if (width / height > 16 / 9) {
        h = height
        w = (h / 9) * 16
      } else {
        w = width
        h = (w / 16) * 9
      }
      if (w === 0 || h === 0) {
        w = this.$store.state.smChange ? 300 : 898
        h = this.$store.state.smChange ? 170 : 506
      }
      this.docViewRect = {width: w, height: h}
      this.$refs.docBoxEl.style.height = `${h}px`
      this.$refs.docBoxEl.style.width = `${w}px`
      if (this.$doc) this.$doc.setSize(w, h)
    },
    // 恢复之前的文档
    async loadPrevDoc() {
      const {list, switch_status} = await this.$doc.getContainerInfo()
      // switch_status 观看端是否显示文档、白板容器
      this.switchStatus = Boolean(switch_status)
      this.fileOrboardList = list

      await this.$forceUpdate()
      await this.$nextTick()
      // 创建所有文档容器
      // 每个文档创建容器
      list.forEach((item) => {
        this.createDocumentOrBorad(item)
      })
      this.$doc.setRemoteData2(list)
      this.isFirst = false
    },

    // 创建容器
    async createDocumentOrBorad(item) {
      this.allComplete = false
      let {cid, active, doc_type, docId, backgroundColor, is_board} = item
      const {width, height} = this.docViewRect
      // 需要找到激活的文档
      if (Number(is_board) === 1) {
        if (!width || !height) console.error('创建文档容器错误', cid, docId, width, height)
        await this.$doc.createDocument({
          elId: cid,
          docId: docId,
          width: width,
          height: height,
          noDispatch: true,
        })
      } else {
        await this.$doc.createBoard({
          elId: cid,
          width: width,
          height: height,
          backgroundColor: item.backgroundColor || '#fff',
          noDispatch: true,
        })
      }
      if (active != 0 && this.$store.state.side_active !== 'desktopShare') {
        this.$store.commit('setSideActive', item.is_board == 1 ? 'file' : 'board')
        this.selectDoc = item
        this.selectContainer({id: item.cid, noDispatch: true})
      }
    },
    docListen(doc) {
      doc.on(window.VHDocSDK.Event.SWITCH_CHANGE, (e) => {
        if (process.env.NODE_ENV !== 'production') console.debug('收到switch_change事件', e)
        if (process.env.NODE_ENV !== 'production') this.hasOp && console.info(`观众可见已${e === 'on' ? '开启' : '关闭'}`)
        this.switchStatus = e === 'on'
      })
      doc.on(window.VHDocSDK.Event.DOCUMENT_NOT_EXIT, (res) => {
        const docId = res.docId
        this.$message.info('文档' + docId + '不存在或已删除')
      })
      doc.on(window.VHDocSDK.Event.ALL_COMPLETE, () => {
        if (process.env.NODE_ENV !== 'production') console.debug('所有文档加载完成')
        const list = this.$doc.getLiveAllCids()
        this.allComplete = true
      })
      doc.on(window.VHDocSDK.Event.ERROR, (e) => {
        this.$message.error(e.message)
      })
      doc.on(window.VHDocSDK.Event.DOCUMENT_LOAD_COMPLETE, (e) => {
        const docId = e.docId
        const info = e.info
        const elId = e.elId
        // this.$message.info('文档加载完成: ' + elId)
      })
      doc.on(window.VHDocSDK.Event.PAGE_CHANGE, async (e) => {
        if (process.env.NODE_ENV !== 'production') console.debug('收到翻页消息', e)
        let {id, info} = e
        let op = {
          cid: id,
          slideIndex: info.slideIndex,
          slidesTotal: info.slidesTotal,
        }
        /**
         * 判断是否为预览的PAGE_CHANGE
         */
        let index = this.fileOrboardList.findIndex((item) => item.cid == id)
        if (index === -1) {
          this.previewInfo = {...this.previewInfo, slideIndex: info.slideIndex + 1, slidesTotal: info.slidesTotal}
          return
        }
        // 初始化加载的时候 翻页不做选择selectDoc
        this.selectDoc = op
        // if (!this.isFirst) {

        //   this.selectContainer({ id: op.cid, noDispatch: false })
        // } else {
        //   // 如果是新建的文档  更新一下当前list的信息
        // }
        await this.$forceUpdate()
        await this.$nextTick()
        let cor = this.fileOrboardList[index]
        if (cor.is_board == 1 && this.selectDoc.cid == cor.cid && !cor.slideIndex) {
          cor.slideIndex = info.slideIndex
          cor.slidesTotal = info.slidesTotal
          this.fileOrboardList.splice(index, 1, cor)
        }
      })
      doc.on(window.VHDocSDK.Event.PLAYBACKCOMPLETE, (e) => {
        if (process.env.NODE_ENV !== 'production') console.info('播放完毕', e)
      })

      // 收到选择容器事件
      !this.isVod && doc.on(window.VHDocSDK.Event.SELECT_CONTAINER, async (event) => {
        if (process.env.NODE_ENV !== 'production') console.debug('收到选择事件', event)
        let cid = event.id
        if (cid == this.selectDoc.cid) return
        /** 检查容器是否存在 */
        let obj = this.fileOrboardList.find((el) => el.cid == cid)
        if (!obj) {
          // 不存在 那么添加
          // let item = { cid: event.id, is_board: event.id.startsWith('document') ? 1 : 2, backgroundColor: event.backgroundColor }
          // this.fileOrboardList.push(item)
          // obj = item
          return
        }
        let keys = {
          file: 1,
          board: 2,
        }
        await this.$forceUpdate()
        await this.$nextTick()
        await wait(50)
        if (obj.is_board === keys[this.$store.state.side_active]) {
          this.selectDoc = obj
        } else {
          this.$store.commit('setSideActive', obj.is_board == 1 ? 'file' : 'board')
          this.selectDoc = obj
        }
        this.selectContainer({id: obj.cid, noDispatch: true})
      })
      // 创建容器事件
      !this.isVod && doc.on(window.VHDocSDK.Event.CREATE_CONTAINER, async (ev) => {
        if (process.env.NODE_ENV !== 'production') console.debug('收到创建事件', ev)
        const {id, type, backgroundColor} = ev
        let item = {cid: id, is_board: type === 'board' ? 2 : 1, backgroundColor: backgroundColor}
        /** 检查容器是否存在 */
        const isExist = this.fileOrboardList.find((el) => el.cid == id)
        if (!isExist) {
          // 不存在 那么添加
          this.fileOrboardList.push(item)
        }
        // 创建容器
        await this.$forceUpdate()
        await this.$nextTick()
        this.createDocumentOrBorad(item)
      })
      // 删除容器事件
      !this.isVod && doc.on(window.VHDocSDK.Event.DELETE_CONTAINER, (e) => {
        if (process.env.NODE_ENV !== 'production') console.debug('收到删除容器事件', e)
        const index = this.fileOrboardList.findIndex((el) => el.cid === e.id)
        this.$doc.destroyContainer({id: e.id})
        index !== -1 && this.fileOrboardList.splice(index, 1)
        if (e.id == this.selectDoc.cid) this.selectDoc = {}
      })

      // 录播
      this.isVod && doc.on(window.VHDocSDK.Event.VOD_CUEPOINT_LOAD_COMPLETE, async (e) => {
        if (Array.isArray(e.chapters)) this.$store.state.docChapters = e.chapters
        const cids = doc.getVodAllCids()
        this.fileOrboardList = []
        for (const cid of cids) {
          this.fileOrboardList.push({
            docId: cid._data && cid._data.docId || cid.docId,
            elId: cid.cid,
            id: cid.cid,
            cid: cid.cid,
            is_board: cid.type !== 'Board',
            width: cid.width,
            height: cid.height,
            active: 0,
          })
        }
        await this.$forceUpdate()
        await this.$nextTick()

        for (const item of this.fileOrboardList) {
          await this.createDocumentOrBorad(item).catch(e => null)
        }
        doc.loadVodIframe()
        this.$root.$emit('docVodReadyComplete')
        if (process.env.NODE_ENV !== 'production') console.log('docVodReadyComplete: ', cids.map(i => i.cid).join(','))
      })
      this.isVod && doc.on(window.VHDocSDK.Event.VOD_TIME_UPDATE, async (e) => {
        const watchOpen = e.watchOpen
        if (this.vodWatchOpen !== watchOpen && process.env.NODE_ENV !== 'production') console.log('watchOpen change', watchOpen)
        this.vodWatchOpen = watchOpen
        const activeId = e.activeId
        if (activeId) {
          const doc = this.fileOrboardList.filter(i => i.cid === activeId)[0]
          if (!doc) console.error('activeId not found: ', activeId)
          if (this.selectDoc && this.selectDoc.cid === doc.cid) return
          this.selectDoc = doc
          this.selectContainer({id: doc.cid, noDispatch: true})
        }
      })
    },
    selectContainer({id, noDispatch = false}) {
      this.$doc.selectContainer({id, noDispatch})
      this.brushActive = null
    },
    // 初始化文档SDK
    async initDoc() {
      const sdkOption = this.$store.getters.getSdkOption
      const user = this.$store.getters.getUser
      // if (!this.hasOp && !this.livein) return (process.env.NODE_ENV !== 'production') && console.log('直播准备中，暂不初始化doc')
      if (process.env.NODE_ENV !== 'production') console.log('初始化doc')
      if (this.$doc) return
      const RoleType = window.VHDocSDK.RoleType
      const role = user.identity === IDENTITY.master || user.identity === IDENTITY.helper ? RoleType.HOST : user.identity === IDENTITY.guest ? RoleType.GUEST : RoleType.SPECTATOR
      const client = window.VHDocSDK.Client.PC_WEB
      // INTERACT FLV HLS
      const mode = role !== RoleType.SPECTATOR ? window.VHDocSDK.PlayMode.INTERACT : window.VHDocSDK.PlayMode.FLV
      const option = {
        appId: sdkOption.appId, // appId，必填
        client: client, // 客户端类型
        channelId: sdkOption.paasImId, // 频道id，isVod为true时，必填
        roomId: sdkOption.paasLiveId, // 房间ID，isVod为true时，必填
        isVod: sdkOption.isVod, // 是否是回放，必填
        accountId: sdkOption.accountId, // 第三方用户id，必填
        token: sdkOption.token, // token，必填
        role: role, // 角色，必填
        mode: mode, // 当前播放流类型，选填
      }

      if (process.env.NODE_ENV !== 'production') console.time('初始化文档SDK')
      try {
        this.$doc = await initDoc(option)
        this.docListen(this.$doc)
        if (!this.isVod) {
          !this.judgeReset() && this.loadPrevDoc()
        }
        if (process.env.NODE_ENV !== 'production') console.timeEnd('初始化文档SDK')
      } catch (error) {
        this.$message.error(error.message)
        roomReport(sdkOption.roomId, {type: 'sdk', target: 'initDoc', error: error.message})
      }
    },
    /**
     * 主持人页面非刷新进入重置所有文档
     */
    judgeReset() {
      const isLoad = pageIsReload()
      if (!isLoad && this.$store.getters.isMaster) {
        // this.$doc.resetContainer()
        return true
      }
      return false
    },
  },
  watch: {
    '$store.state.side_active': function (newValue, oldValue) {
      let is_board = newValue === 'file' ? 1 : 2
      if (this.selectDoc.is_board == is_board) {
        return false
      }
      if (newValue === 'board') {
        this.prevDoc.file = this.selectDoc
        this.selectDoc = this.prevDoc.board || this.fileOrboardList.filter((item) => Number(item.is_board) === 2)[0] || {}
      } else if (newValue === 'file') {
        this.prevDoc.board = this.selectDoc
        this.selectDoc = this.prevDoc.file || this.fileOrboardList.filter((item) => Number(item.is_board) === 1)[0] || {}
      }
      this.selectDoc.cid && this.selectContainer({id: this.selectDoc.cid})
    },
  },
}
</script>

<style lang="less" scoped>
.MainContent {
  flex: 1;
  min-height: 0;
  background: #fff;
  color: #000;
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;

  .docFileView {
    flex: 1;
    min-height: 0;
    min-width: 0;
    background-color: #000;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    border-left: 1px solid #000;
    border-right: 1px solid #000;

    &:hover {
      .brush-box {
        display: block;
      }
    }

    .brush-box {
      position: absolute;
      display: none;
      top: 10px;
      width: 452px;
      height: 40px;
      left: 50%;
      transform: translate(-50%);
      // padding: 0px 10px;
      padding-left: 10px;
      background-color: rgba(0, 0, 0, 0.6);
      border-radius: 20px;
      z-index: 999;

      .brush-item {
        color: #f7f7f7;
        display: inline-block;
        line-height: 40px;
        margin-right: 10px;
        position: relative;

        > i {
          font-size: 34px;
          cursor: pointer;

          &.active {
            color: #1ad5ce;
          }
        }

        .brush-item-list {
          display: none;
          width: 42px;
          background-color: rgba(0, 0, 0, 0.6);
          border-radius: 20px;
          position: absolute;
          left: -5px;
          padding-top: 10px;
          padding-bottom: 10px;

          .sub-item {
            text-align: center;
            height: 30px;
            line-height: 30px;
            margin-top: 4px;

            .icon {
              font-size: 30px;
              cursor: pointer;
              line-height: 30px;

              border-radius: 50%;
              width: 30px;
              height: 30px;

              &:hover {
                background: rgba(22, 23, 25, 0.5);
              }

              &.active {
                background: rgba(22, 23, 25, 0.5);
                border: 1px solid #1ad5ce;
              }
            }

            .sehuan {
              display: inline-block;
              cursor: pointer;
              width: 30px;
              height: 30px;
              text-align: center;
              line-height: 30px;
              border-radius: 50%;

              > span {
                width: 12px;
                height: 12px;
                box-sizing: border-box;
                border: 1px solid #fff;
                display: inline-block;
                border-radius: 2px;
              }

              &:hover {
                background: rgba(22, 23, 25, 0.5);
              }

              &.active {
                background: rgba(22, 23, 25, 0.5);
                border: 1px solid #1ad5ce;
              }
            }

            .xiangsu {
              cursor: pointer;
              display: inline-block;
              width: 30px;
              height: 30px;
              text-align: center;
              line-height: 30px;
              border-radius: 50%;

              &:hover {
                background: rgba(22, 23, 25, 0.5);
              }

              &.active {
                background: rgba(22, 23, 25, 0.5);
                border: 1px solid #1ad5ce;
              }
            }
          }
        }

        &:hover {
          > i {
            color: #1ad5ce;
          }

          .brush-item-list {
            display: block;
          }
        }
      }
    }

    .doc-box {
      position: relative;
      background-color: #0f0f0f;
      overflow: hidden;
      pointer-events: none;
    }

    .nodata {
      height: 100%;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      color: #666;
      font-size: 14px;

      > span {
        margin-top: 15px;
      }
    }

    .visible {
      visibility: visible;
    }
  }
}

.nosorcll::-webkit-scrollbar {
  display: none;
  width: 0 !important;
}
</style>
