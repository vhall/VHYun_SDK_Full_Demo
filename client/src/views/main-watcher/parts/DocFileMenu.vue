<template>
  <div class="fileMenuBox">
    <div class="fileList">
      <div class="leftMenu">
        <div v-for="(item, index) in menuList" :key="item.cid"
             :class="['fileItem', item.cid === selectDoc.cid ? 'active' : '']" @click="clooseFile(item)">
          <span class="word">{{ item.cid }}</span>
          <i class="shu"></i>
        </div>
      </div>
      <div class="rightSet">
        <i class="iconfont iconicon-shangyiye" title="上一步" @click="pageChange('prev')"></i>
        <span class="word">{{ pageString }}</span>
        <i class="iconfont iconicon-xiayiye" title="下一步" @click="pageChange('next')"></i>

        <i :class="['iconfont', 'iconicon-fangda', activeSet == 'big' ? 'active' : '']" title="放大"
           @click="setFile('big')"></i>
        <i :class="['iconfont', 'iconicon-suoxiao', activeSet == 'small' ? 'active' : '']" title="缩小"
           @click="setFile('small')"></i>
        <i :class="['iconfont', 'iconicon-huanyuan']" title="还原" @click="setFile('reset')"></i>
        <i :class="['iconfont', 'iconicon-yidong', activeSet == 'move' ? 'active' : '']" title="移动"
           @click="setFile('move')"></i>
        <i class="shu"></i>
        <i :class="['iconfont', 'iconicon-shouqi', thumbnailShow ? '' : 'icon_shouqi']"
           :title="thumbnailShow ? '收起' : '展开'" @click="fileContList"></i>
      </div>
    </div>
    <div v-show="thumbnailShow" class="fileContList">
      <div class="rightList" ref="thumbnailList">
        <div v-for="(item, index) in ThumbnailList" :key="index"
             :class="['thumbnailItem', item === activeThumbnail ? 'active' : '']">
          <img :src="item" alt="" width="100%" style="height: 100%; object-fit: contain;"
               @click="changeThumbnail(item)"/>
          <span>{{ index + 1 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Modal from '@/components/Modal/index'
import Button from '@/components/Button/index'
import {rsApi} from '@/common/api'
import {wait} from '@/utils'
import {BUS_LOCAL_EVENTS} from '@/common/contant'

export default {
  name: 'DocFileMenu',
  components: {Modal, Button},
  props: ['changeViewDoc', 'list', 'selectDoc', 'addNewFile', 'delFile', 'allComplete'],
  data() {
    return {
      thumbnailShow: true,
      addfileVisible: false,
      ThumbnailList: [],
      activeThumbnail: null,
      pageString: '0 / 0',
      activeSet: null,
      uploadTxt: '上传文档',
      tableData: [],
      docsContent: 1,
      currentPage: 1,
      $doc: null,
      timeInterval: null,
      status: false,
      queue: [],
    }
  },
  mounted() {
    // 刷新列表
    this.$root.$on(BUS_LOCAL_EVENTS.RESOURCE_CHANGE, (data) => {
      if (!data || data.resource !== 'doc') return
    })
  },
  methods: {
    setDoc(doc) {
      this.$doc = doc
    },
    fileContList: function () {
      this.thumbnailShow = !this.thumbnailShow
    },
    async clooseFile(item) {
      this.changeViewDoc(item)
    },
    pageChange(str) {
      if (!this.selectDoc.cid) {
        return false
      }
      let opts = {
        id: this.selectDoc.cid,
      }
      if (str === 'next') {
        this.$doc.nextStep(opts)
      } else if (str === 'prev') {
        this.$doc.prevStep(opts)
      }
    },
    setFile(str) {
      if (!this.selectDoc.cid) {
        return false
      }
      this.activeSet = str
      let opts = {
        id: this.selectDoc.cid,
      }
      if (str === 'big') {
        this.$doc.zoomIn(opts)
      } else if (str === 'small') {
        this.$doc.zoomOut(opts)
      } else if (str === 'reset') {
        this.$doc.zoomReset(opts)
      } else if (str === 'move') {
        this.$doc.move(opts)
      }
    },
    changeThumbnail(item) {
      let index = this.ThumbnailList.findIndex((el) => el === item)
      this.$doc.gotoPage({
        id: this.selectDoc.cid,
        page: index,
      })
      this.activeThumbnail = this.ThumbnailList[index]
    },
    // 获取缩略图
    async getThumbnailList(item) {
      let data = await this.$doc.getThumbnailList({id: item.cid})
      let list = data.find((el) => el.id == item.cid).list
      this.ThumbnailList = list
      this.activeThumbnail = list[0]
    },
    foramtPage(item) {
      let str = '0 / 0'
      str = `${item.slideIndex + 1} / ${item.slidesTotal}`
      this.pageString = str
      this.activeThumbnail = this.ThumbnailList[item.slideIndex]
    },
    async scrollIntoView(item) {
      await wait(100)
      if (!this.$refs.thumbnailList) return
      if (!this.$refs.thumbnailList.querySelector) return
      const el = this.$refs.thumbnailList.querySelector('.thumbnailItem.active')
      if (!el) return
      if (el.scrollIntoViewIfNeeded) return el.scrollIntoViewIfNeeded(true)
      if (el.scrollIntoView) return el.scrollIntoView({ behavior: 'smooth' })
    }
  },
  computed: {
    menuList: function () {
      return this.list.filter((item) => item.is_board == 1)
    },
    action: function () {
      return rsApi.docCreateUrl(this.$store.state.room.roomId)
    },
  },
  watch: {
    selectDoc: async function (item) {
      if (item.is_board == 2) return false
      if (item.cid) {
        if (this.allComplete) {
          await this.getThumbnailList(item)
          this.foramtPage(item)
          this.scrollIntoView(item)
        } else {
          this.queue.push({fn: this.getThumbnailList.bind(this), data: item}, {
            fn: this.foramtPage.bind(this),
            data: item
          })
        }
      } else {
        this.ThumbnailList = []
        this.activeThumbnail = null
        this.pageString = '0 / 0'
      }
    },
    allComplete(newValue, oldValue) {
      console.warn('watch', newValue)
      if (newValue && this.queue.length) {
        this.queue.forEach(async ({fn, data}) => {
          await fn(data)
        })
        this.queue = []
      }
    },
  },
}
</script>

<style lang="less" scoped>
.fileMenuBox {
  .fileList {
    height: 40px;
    background: #222;
    display: flex;
    border-left: 1px black solid;
    border-right: 1px black solid;

    .addFileBox .right {
      cursor: pointer;
    }

    .leftMenu {
      flex: 1;
      display: flex;
      width: 0px;
      color: #999;
      overflow: auto;

      .fileItem {
        display: flex;
        align-items: center;
        padding-left: 16px;
        cursor: pointer;

        .iconClose {
          &:hover {
            color: #1e90ff;
          }
        }

        .word {
          margin-right: 10px;
          cursor: pointer;
          white-space: nowrap;
        }

        > i {
          font-size: 14px;
          margin-right: 16px;
        }

        .shu {
          width: 1px;
          height: 16px;
          background: #363636;
          margin-right: 0px;
        }

        &.active {
          background: #000;
          color: #1e90ff;

          .shu {
            display: none;
          }
        }

        &:last-child {
          .shu {
            width: 0px;
          }
        }
      }
    }

    .rightSet {
      min-width: 330px;
      color: #f7f7f7;
      display: flex;
      // align-items: center;
      margin-left: 20px;
      line-height: 40px;

      .word {
        margin-right: 10px;
        min-width: 46px;
        text-align: right;
      }

      > i {
        font-size: 24px;
        margin-right: 8px;
        margin-left: 8px;
        cursor: pointer;

        &.active {
          color: #1ad5ce;
        }

        &.shu {
          width: 1px;
          height: 16px;
          background: #363636;
          margin-top: 12px;
        }
      }

      > i.iconicon-xiayiye {
        margin-left: 0;
      }

      > i.iconicon-shangyiye {
        margin-right: 0;
      }

      .switch {
        display: flex;
        justify-content: center;
        align-items: center;

        b {
          font-weight: normal;
          margin-right: 8px;
        }
      }

      .icon_shouqi {
        transform: rotate(180deg);
      }
    }
  }

  .fileContList {
    width: 100%;
    height: 104px;
    background: #000;
    padding: 16px;
    display: flex;

    .addFile {
      width: 104px;
      height: 74px;
      background: #222;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;

      > i {
        color: #d8d8d8;
        font-size: 16px;
      }

      > span {
        color: #999;
        font-size: 14px;
      }
    }

    .rightList {
      display: flex;
      flex: 1;
      width: 0px;
      overflow: auto;
      scrollbar-width: none;

      .thumbnailItem {
        width: 128px;
        min-width: 128px;
        height: 72px;
        margin-left: 16px;
        background-color: #222;
        position: relative;

        &.active {
          border: 2px solid #1ad5ce;

          span {
            left: 1px;
            bottom: 1px;
          }
        }

        span {
          position: absolute;
          left: 0px;
          bottom: 0px;
          background-color: rgba(0, 0, 0, 0.7);
          width: 24px;
          height: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 12px;
          color: #fff;
        }
      }
    }

    .rightList::-webkit-scrollbar {
      width: 0;
      height: 0;
      display: none;
    }
  }
}

.AddFileBox {
  padding: 32px;
  padding-top: 0;

  .AddFileBox-h {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    color: #333333;
    margin-bottom: 10px;

    .uploadTxt {
      width: 78px;
      padding: 0;
    }

    .right {
      cursor: pointer;

      i {
        color: #666;
        margin-right: 5px;
      }

      &:active {
        color: #1e90ff;

        i {
          color: #1e90ff;
        }
      }
    }
  }

  .AddFileBox-c {
    .table-box {
      min-height: 313px;
    }

    /deep/ .el-table_1_column_1 .cell {
      padding-left: 32px;
    }

    .fileSetSpan {
      cursor: pointer;
      display: inline-block;

      &:hover {
        color: #1e90ff;
      }
    }

    .nameBox {
      width: 210px;
      display: flex;
      align-items: center;

      > img {
        width: 22px;
        height: 28px;
      }

      span {
        color: #333;
        font-size: 14px;
      }

      .name {
        max-width: 150px;
        overflow: hidden;
        margin-left: 8px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .process {
      .process-num {
        font-size: 12px;
        color: #666666;
        line-height: 16px;
      }

      .changePx {
        font-size: 14px;
      }
    }
  }
}

.pagination {
  text-align: center;
}
</style>
