<template>
  <div class="MainContent">
    <div id="docFileView" class="docFileView" ref="docFileViewEl">
      <div class="doc-box" ref="docBoxEl" :class="{ hidden: hasOp ? false : !switchStatus }">
        <ul class="brush-box" v-if="hasOp && selectDoc && selectDoc.cid">
          <li class="brush-item" v-for="item in brushData" :key="item.icon">
            <el-tooltip effect="dark" :content="item.word" placement="top" v-if="item.word">
              <i :class="['iconfont', item.icon, brushActive === item.icon ? 'active' : '']" :title="item.title" @click="brushSet(item)"></i>
            </el-tooltip>
            <i v-else :class="['iconfont', item.icon, item.sub.find((el) => el.icon === brushActive) ? 'active' : '']" :title="item.title"></i>

            <ul class="brush-item-list" v-if="item.sub">
              <li v-for="kitem in item.sub" :key="kitem.icon || kitem" class="sub-item">
                <el-tooltip effect="dark" :content="kitem.word" placement="right">
                  <i
                    v-if="item.icon == 'iconicon-xingzhuang' || item.icon == 'iconicon-xiantiao'"
                    @click="brushSet(item, kitem)"
                    :class="['iconfont', kitem.icon, 'icon', brushActive == kitem.icon ? 'active' : '']"
                  ></i>
                </el-tooltip>
                <el-tooltip effect="dark" :content="item.subWord" placement="right">
                  <span @click="brushSet(item, kitem)" :class="['xiangsu', brushActive == kitem ? 'active' : '']" v-if="item.icon === 'iconicon-xiangsu'">
                    {{ kitem }}
                  </span>
                </el-tooltip>
                <el-tooltip effect="dark" :content="item.subWord" placement="right">
                  <span @click="brushSet(item, kitem)" :class="['sehuan', brushActive == kitem ? 'active' : '']" v-if="item.icon === 'iconicon-sehuan'">
                    <span :style="{ background: kitem }"></span>
                  </span>
                </el-tooltip>
              </li>
            </ul>
          </li>
        </ul>
        <!-- display:none|block 会影响父级元素和iframe的通信，会导致通信时长延长5s左右，故采用visible -->
        <div v-for="item of fileOrboardList" :id="item.cid" :key="item.cid" :class="{ hidden: item.cid !== selectDoc.cid, nosorcll: true }"></div>
        <div class="nodata" v-show="!selectDoc.cid" :class="{ visible: !selectDoc.cid }">
          <img :src="require(`@/assets/images/noFile@3x.png`)" width="100" height="100" alt="" />
          <span>暂无{{ $store.state.side_active === 'file' ? '文档' : '白板' }}</span>
        </div>
      </div>
    </div>
    <DocFileMenu
      v-if="hasOp"
      v-show="$store.state.side_active === 'file'"
      :allComplete="allComplete"
      :selectDoc="selectDoc"
      :list="fileOrboardList"
      :changeViewDoc="changeViewDoc"
      :doc="$data.$doc"
      :addNewFile="addNewFile"
      :delFile="delFile"
      :hasOp="hasOp"
      ref="DocFileMenu"
      @needPreview="needPreview"
    />
    <DocBoardMenu
      v-if="hasOp"
      v-show="$store.state.side_active === 'board'"
      :allComplete="allComplete"
      :selectDoc="selectDoc"
      :list="fileOrboardList"
      :changeViewDoc="changeViewDoc"
      :delFile="delFile"
      :addNewFile="addNewFile"
      ref="DocBoardMenu"
    />
    <PreviewDoc v-if="previewInfo.showPreview" :previewInfo="previewInfo" @closePreview="closePreview" ref="PreviewDoc" />
  </div>
</template>

<script>
import DocFileMenu from './DocFileMenu'
import DocBoardMenu from './DocBoardMenu'
import PreviewDoc from './previewDoc'
import { IDENTITY } from '@/utils'
import { initDoc } from '@/utils/sdk'
import { roomReport } from '@/common/api'
let RlementResizeDetector = require('element-resize-detector')
export default {
  name: 'MainContentDoc',
  components: { DocFileMenu, DocBoardMenu, PreviewDoc },
  data() {
    return {
      docs: {},
      docViewRect: null,
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
      brushData: [
        {
          icon: 'iconicon-ziti',
          key: '',
          word: '文字',
        },
        {
          icon: 'iconicon-xingzhuang',
          sub: [
            {
              icon: 'iconicon-zhengfangxing',
              word: '矩形',
            },
            {
              icon: 'iconicon-sanjiaoxing',
              word: '等腰三角形',
            },
            {
              icon: 'iconicon-zhijiaosanjiaoxing',
              word: '直角三角形',
            },
            {
              icon: 'iconicon-yuanxing',
              word: '椭圆',
            },
          ],
        },
        {
          icon: 'iconicon-xiantiao',
          sub: [
            {
              icon: 'iconicon-danxiangjiantou',
              word: '单箭头',
            },
            {
              icon: 'iconicon-shuangxiangjiantou',
              word: '双箭头',
            },
          ],
        },
        {
          icon: 'iconicon-huabi',
          word: '自由画笔',
        },
        {
          icon: 'iconicon-yingguangbi',
          word: '荧光笔',
        },
        {
          icon: 'iconicon-xiangsu',
          subWord: '画笔宽度',
          sub: ['5', '10', '15', '20', '25', '30'],
        },
        {
          icon: 'iconicon-sehuan',
          subWord: '画笔颜色',
          sub: ['#1e89e4', '#b01eff', '#5064fe', '#f1831c', '#ff3d41', '#1ad5ce', '#ffffff', '#666', '#000'],
        },
        {
          icon: 'iconicon-xiangpica',
          word: '橡皮擦',
        },
        {
          icon: 'iconicon-qingchu',
          word: '全部删除',
        },
        {
          icon: 'iconicon-gongjuchushihua',
          word: '取消画笔',
        },
      ],
      prevDoc: {
        file: null,
        board: null,
      },
    }
  },
  created() {
    this.$root.$once('startInitDoc', () => {
      this.initDoc()
    })
    this.$root.$on('startPublish', () => {
      this.switchStatus = true
      this.$doc.start(1, 2)
      this.$doc.republish()
      this.$doc.switchOnContainer()
      this.$message.info(`观众可见已开启`)
    })
    this.$root.$on('stopPublish', () => {
      this.switchStatus = false
      this.$doc.start(2, 2)
      this.$doc.switchOffContainer()
      this.fileOrboardList.forEach(({ cid }) => {
        this.$doc.destroyContainer({ id: cid })
      })
      this.fileOrboardList = []
      this.selectDoc = {}
      this.prevDoc = { file: null, board: null }
      this.$doc.resetContainer()
    })
  },
  mounted() {
    this.resize()
    let erd = RlementResizeDetector()
    let _this = this
    erd.listenTo(_this.$refs.docFileViewEl, _this.resize)
  },
  methods: {
    resize(e) {
      let { width, height } = this.$refs.docFileViewEl.getBoundingClientRect()
      let w = null,
        h = null
      if (width / height > 16 / 9) {
        h = height
        w = (h / 9) * 16
      } else {
        w = width
        h = (w / 16) * 9
      }
      this.docViewRect = { width: w, height: h }
      this.$refs.docBoxEl.style.height = `${h}px`
      this.$refs.docBoxEl.style.width = `${w}px`
      if (this.$doc) this.$doc.setSize(w, h)
    },
    // 恢复之前的文档
    async loadPrevDoc() {
      const { list, switch_status } = await this.$doc.getContainerInfo()
      // switch_status 观看端是否显示文档、白板容器
      this.switchStatus = Boolean(switch_status)
      this.fileOrboardList = list

      // 创建所有文档容器
      this.$nextTick(() => {
        // 每个文档创建容器
        list.forEach((item) => {
          this.createDocumentOrBorad(item)
        })
        this.$doc.setRemoteData2(list)
        this.isFirst = false
      })
    },

    // 创建容器
    async createDocumentOrBorad(item) {
      this.allComplete = false
      let { cid, active, doc_type, docId, backgroundColor, is_board } = item
      const { width, height } = this.docViewRect
      // 需要找到激活的文档
      if (is_board == 1) {
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
        this.selectContainer({ id: item.cid, noDispatch: true })
      }
    },
    docListen(doc) {
      doc.on(window.VHDocSDK.Event.SWITCH_CHANGE, (e) => {
        console.warn('收到switch_change事件', e)
        this.hasOp && this.$message.info(`观众可见已${e === 'on' ? '开启' : '关闭'}`)
        this.switchStatus = e === 'on'
      })
      doc.on(window.VHDocSDK.Event.DOCUMENT_NOT_EXIT, (res) => {
        const docId = res.docId
        this.$message.info('文档' + docId + '不存在或已删除')
      })
      doc.on(window.VHDocSDK.Event.ALL_COMPLETE, () => {
        if (process.env.NODE_ENV !== 'production') console.warn('所有文档加载完成')
        const list = this.$doc.getLiveAllCids()
        if (list.includes(this.previewInfo.elId)) this.previewInfo.canOperate = true
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
      doc.on(window.VHDocSDK.Event.PAGE_CHANGE, (e) => {
        console.warn('收到翻页消息', e)
        let { id, info } = e
        let op = {
          cid: id,
          slideIndex: info.slideIndex,
          slidesTotal: info.slidesTotal,
        }
        /**
         * 判断是否为预览的PAGE_CHANGE
         */
        let index = this.fileOrboardList.findIndex((item) => item.cid == id)
        if (index == -1) {
          this.previewInfo = { ...this.previewInfo, slideIndex: info.slideIndex + 1, slidesTotal: info.slidesTotal }
          return
        }
        // 初始化加载的时候 翻页不做选择selectDoc
        this.selectDoc = op
        // if (!this.isFirst) {
          
        //   this.selectContainer({ id: op.cid, noDispatch: false })
        // } else {
        //   // 如果是新建的文档  更新一下当前list的信息
        // }
        this.$nextTick(() => {
          let cor = this.fileOrboardList[index]
          if (cor.is_board == 1 && this.selectDoc.cid == cor.cid && !cor.slideIndex) {
            cor.slideIndex = info.slideIndex
            cor.slidesTotal = info.slidesTotal
            this.fileOrboardList.splice(index, 1, cor)
          }
        })
      })
      doc.on(window.VHDocSDK.Event.PLAYBACKCOMPLETE, (e) => {
        if (process.env.NODE_ENV !== 'production') console.info('播放完毕', e)
      })
      // 收到选择容器事件
      doc.on(window.VHDocSDK.Event.SELECT_CONTAINER, async (event) => {
        if (process.env.NODE_ENV !== 'production') console.warn('收到选择事件', event)
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
        await this.$nextTick()
        if (obj.is_board === keys[this.$store.state.side_active]) {
          this.selectDoc = obj
        } else {
          this.$store.commit('setSideActive', obj.is_board == 1 ? 'file' : 'board')
          this.selectDoc = obj
        }
        this.selectContainer({ id: obj.cid, noDispatch: true })
      })
      // 创建容器事件
      doc.on(window.VHDocSDK.Event.CREATE_CONTAINER, async ({ id, type, backgroundColor }) => {
        if (process.env.NODE_ENV !== 'production') console.warn('收到创建事件', { id, type, backgroundColor })
        let item = { cid: id, is_board: type == 'board' ? 2 : 1, backgroundColor: backgroundColor }
        /** 检查容器是否存在 */
        const isExist = this.fileOrboardList.find((el) => el.cid == id)
        if (!isExist) {
          // 不存在 那么添加
          this.fileOrboardList.push(item)
        }
        // 创建容器
        await this.$nextTick()
        this.createDocumentOrBorad(item)
      })
      // 删除容器事件
      doc.on(window.VHDocSDK.Event.DELETE_CONTAINER, (e) => {
        if (process.env.NODE_ENV !== 'production') console.warn('收到删除容器事件', e)
        const index = this.fileOrboardList.findIndex((el) => el.cid === e.id)
        this.$doc.destroyContainer({ id: e.id })
        index != -1 && this.fileOrboardList.splice(index, 1)
        if (e.id == this.selectDoc.cid) this.selectDoc = {}
      })
    },
    // 切换文档
    async changeViewDoc(item) {
      this.selectDoc = item
      this.selectContainer({ id: item.cid })
    },
    selectContainer({ id, noDispatch = false }) {
      this.$doc.selectContainer({ id, noDispatch })
      this.brushActive = null
    },
    /****
     * 添加文档或者白板
     * @type item 配置信息
     * @type is_board  1文档  2白板
     */
    async addNewFile(item, is_board = 1) {
      this.allComplete = false
      const { width, height } = this.docViewRect
      const elId = this.$doc.createUUID(is_board == 1 ? 'document' : 'board')
      let options = {
        docId: item.docId,
        elId,
        id: elId,
        width,
        height,
      }
      item.cid = elId
      item.is_board = is_board
      this.fileOrboardList.push({ ...item })
      await this.$nextTick()
      if (is_board == 1) {
        this.$doc.createDocument(options)
        this.selectContainer({ id: elId })
        try {
          const { status, status_jpeg, slideIndex, slidesTotal, converted_page, converted_page_jpeg } = await this.$doc.loadDoc({
            docId: item.docId,
            id: elId,
          })
          let temp = {}
          if (status == 200) {
            temp = { slideIndex, slidesTotal }
          } else if (status_jpeg == 200) {
            temp = { slideIndex: converted_page, slidesTotal: converted_page_jpeg }
          }
          this.selectDoc = {
            cid: elId,
            is_board: 1,
            ...temp,
          }
        } catch (error) {
          console.error(error)
        }
      } else {
        let _item = {
          graphicType: window.VHDocSDK.GRAPHIC[item.type],
          stroke: item.color,
          strokeWidth: Number(item.num),
        }

        this.$doc.createBoard({ ...options, backgroundColor: `#${Math.floor(Math.random() * 0xffffff).toString(16)}`, option: _item })
        this.selectContainer({ id: elId })
        this.selectDoc = {
          cid: elId,
          is_board: 2,
        }
      }
    },
    delFile(item) {
      if (!this.hasOp) {
        return false
      }
      this.$doc.destroyContainer({ id: item.cid })
      let list = [...this.fileOrboardList]
      let index = list.findIndex((el) => el.cid == item.cid)
      list.splice(index, 1)
      this.fileOrboardList = list
      let side_type = this.$store.state.side_active
      let _list = []
      if (side_type === 'board') {
        // 白板
        _list = list.filter((el) => el.is_board == 2)
      } else {
        _list = list.filter((el) => el.is_board == 1)
      }
      this.selectDoc = _list[0] || {}
      this.selectDoc.cid && this.selectContainer({ id: this.selectDoc.cid })
    },
    async brushSet(item, kitem) {
      let opts = {
        id: this.selectDoc.cid,
      }
      if (item.icon !== 'iconicon-xiangsu' && item.icon !== 'iconicon-sehuan') this.$doc.cancelZoom()
      switch (item.icon) {
        case 'iconicon-ziti':
          this.brushActive = item.icon
          this.$doc.setText(opts)
          break
        case 'iconicon-xingzhuang':
          if (kitem.icon === 'iconicon-zhengfangxing') {
            this.$doc.setSquare(opts)
          } else if (kitem.icon == 'iconicon-yuanxing') {
            this.$doc.setCircle(opts)
          } else if (kitem.icon === 'iconicon-sanjiaoxing') {
            this.$doc.setIsoscelesTriangle(opts)
          } else if (kitem.icon === 'iconicon-zhijiaosanjiaoxing') {
            this.$doc.setRightTriangle(opts)
          }
          this.brushActive = kitem.icon
          break
        case 'iconicon-xiantiao':
          if (kitem.icon === 'iconicon-danxiangjiantou') {
            this.$doc.setSingleArrow(opts)
          } else if (kitem.icon == 'iconicon-shuangxiangjiantou') {
            this.$doc.setDoubleArrow(opts)
          } else {
            this.$doc.setSingleArrow(opts)
          }
          this.brushActive = kitem.icon
          break
        case 'iconicon-huabi':
          this.$doc.setPen(opts)
          this.brushActive = item.icon
          break
        case 'iconicon-yingguangbi':
          this.brushActive = item.icon
          this.$doc.setHighlighters(opts)
          break
        case 'iconicon-xiangsu':
          opts.width = Number(kitem)
          this.$doc.setStrokeWidth(opts)
          break
        case 'iconicon-sehuan':
          opts.color = kitem
          this.$doc.setStroke(opts)
          break
        case 'iconicon-xiangpica':
          this.$doc.setEraser(opts)
          this.brushActive = item.icon
          break
        case 'iconicon-qingchu':
          this.$doc.clear(opts)
          this.brushActive = item.icon
          break
        case 'iconicon-gongjuchushihua':
          this.$doc.cancelDrawable(opts)
          this.brushActive = item.icon
          break
        default:
          break
      }
    },
    /**
     * 获得预览信息
     */
    async needPreview({ docId }) {
      this.previewInfo.showPreview = true
      this.previewInfo.docId = docId
      this.previewInfo.elId = this.$doc.createUUID('document')
      await this.$nextTick()
      this.$refs.PreviewDoc.setDoc(this.$doc)
    },
    /**
     * 关闭预览
     */
    closePreview() {
      this.previewInfo = {
        showPreview: false,
        docId: '',
        slideIndex: 0,
        slidesTotal: 0,
        canOperate: false,
        elId: '',
      }
      this.$refs.DocFileMenu.addFile()
    },
    // 初始化文档SDK
    async initDoc() {
      const sdkOption = this.$store.getters.getSdkOption
      const user = this.$store.getters.getUser
      if (process.env.NODE_ENV !== 'production') console.time('初始化文档SDK')
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
      try {
        this.$doc = await initDoc(option)
        this.docListen(this.$doc)
        !this.judgeReset() && this.loadPrevDoc()
        if (this.hasOp) {
          this.$refs.DocFileMenu.setDoc(this.$doc)
          this.$refs.DocBoardMenu.setDoc(this.$doc)
        }
        if (process.env.NODE_ENV !== 'production') console.timeEnd('初始化文档SDK')
      } catch (error) {
        this.$message.error(error.message)
        roomReport(sdkOption.roomId, { type: 'sdk', target: 'initDoc', error: error.message })
      }
    },
    /**
     * 主持人页面非刷新进入重置所有文档
     */
    judgeReset() {
      const isLoad = window?.performance?.navigation?.type === 1
      if (!isLoad && this.$store.state.user.identity === IDENTITY.master) {
        this.$doc.resetContainer()
        // this.isFirst = 
        return true
      }
      return false
    },
  },
  computed: {
    hasOp: function() {
      return this.$store.state.user.identity === IDENTITY.helper || this.$store.state.user.identity === IDENTITY.master
    },
  },
  watch: {
    '$store.state.side_active': function(newValue, oldValue) {
      let is_board = newValue == 'file' ? 1 : 2
      if (this.selectDoc.is_board == is_board) {
        return false
      }
      if (newValue == 'board') {
        this.prevDoc.file = this.selectDoc
        this.selectDoc = this.prevDoc.board || this.fileOrboardList.filter((item) => item.is_board == 2)[0] || {}
      } else if (newValue == 'file') {
        this.prevDoc.board = this.selectDoc
        this.selectDoc = this.prevDoc.file || this.fileOrboardList.filter((item) => item.is_board == 1)[0] || {}
      }
      this.selectDoc.cid && this.selectContainer({ id: this.selectDoc.cid })
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
    background-color:#000;
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
