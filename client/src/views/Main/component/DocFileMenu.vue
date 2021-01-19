<template>
  <div class="fileMenuBox">
    <div class="fileList">
      <div class="leftMenu">
        <div v-for="(item, index) in menuList" :key="item.cid" :class="['fileItem', item.cid === selectDoc.cid ? 'active' : '']" @click="clooseFile(item)">
          <span class="word">{{ item.cid }}</span>
          <i class="iconfont iconicon-guanbi iconClose" @click.stop="delFile(item, index)"></i>
          <i class="shu"></i>
        </div>
      </div>
      <div class="rightSet">
        <i class="iconfont iconicon-shangyiye" title="上一步" @click="pageChange('prev')"></i>
        <span class="word">{{ pageString }}</span>
        <i class="iconfont iconicon-xiayiye" title="下一步" @click="pageChange('next')"></i>

        <i :class="['iconfont', 'iconicon-fangda', activeSet == 'big' ? 'active' : '']" title="放大" @click="setFile('big')"></i>
        <i :class="['iconfont', 'iconicon-suoxiao', activeSet == 'small' ? 'active' : '']" title="缩小" @click="setFile('small')"></i>
        <i :class="['iconfont', 'iconicon-huanyuan']" title="还原" @click="setFile('reset')"></i>
        <i :class="['iconfont', 'iconicon-yidong', activeSet == 'move' ? 'active' : '']" title="移动" @click="setFile('move')"></i>
        <i class="shu"></i>
        <i :class="['iconfont', 'iconicon-shouqi', thumbnailShow ? '' : 'icon_shouqi']" :title="thumbnailShow ? '收起' : '展开'" @click="fileContList"></i>
      </div>
    </div>
    <div v-show="thumbnailShow" class="fileContList">
      <div class="addFile" @click="addFile">
        <i class="iconfont iconicon-zengjiawendang"></i>
        <span>添加文档</span>
      </div>
      <div class="rightList">
        <div v-for="(item, index) in ThumbnailList" :key="index" :class="['thumbnailItem', item === activeThumbnail ? 'active' : '']">
          <img :src="item" alt="" width="100%" style="height: 100%; object-fit: contain;" @click="changeThumbnail(item)" />
          <span>{{ index + 1 }}</span>
        </div>
      </div>
    </div>

    <Modal :visible="addfileVisible" @close="closeAddFileModal" title="文档列表" width="800px">
      <div class="AddFileBox addFileBox">
        <div class="AddFileBox-h">
          <el-upload
            class="upload-demo"
            :action="action"
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
            :on-progress="handleProgress"
            :on-success="handleSuccess"
            :on-error="handleError"
            :show-file-list="false"
            name="document"
          >
            <Button slot="trigger" type="primary" class="uploadTxt">{{ uploadTxt }}</Button>
          </el-upload>
          <div class="right" @click="updateDocList">
            <i class="iconfont iconicon-shuaxin"></i>
            <span class="word">刷新列表 </span>
          </div>
        </div>
        <div class="AddFileBox-c">
          <div class="table-box">
          <el-table :data="tableData" style="width: 100%">
            <el-table-column prop="docId" label="文档ID" width="120"> </el-table-column>
            <el-table-column prop="name" label="文档名称" min-width="180">
              <template slot-scope="scope">
                <div class="nameBox">
                  <img :src="renderFileSrc(scope.row.title).src" alt="" />
                  <el-tooltip class="item" effect="dark" :content="scope.row.title" placement="top">
                    <span class="name">{{ scope.row.title }}</span>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="pageNum" label="文档页数"></el-table-column>
            <el-table-column prop="process" label="进度">
              <template slot-scope="scope">
                <div class="process">
                  <div class="process-num" :class="{ changePx: !(scope.row.process > 0 && scope.row.process < 100) }">
                    {{ scope.row.process == 100 ? '转码完成' : scope.row.process == 0 ? '待转码' : scope.row.process == -1 ? '转码失败' : `${scope.row.process}%` }}
                  </div>
                  <el-progress :percentage="scope.row.process" :show-text="false" v-if="scope.row.process > 0 && scope.row.process < 100"></el-progress>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="set" label="操作">
              <template slot-scope="scope">
                <span class="fileSetSpan" @click="yulan(scope.row)" v-if="scope.row.process == 100">预览</span>
                <span style="margin-left: 10px" class="fileSetSpan" @click="yanshi(scope.row)" v-if="scope.row.process == 100">演示</span>
              </template>
            </el-table-column>
          </el-table>
          </div>
          <div class="pagination">
            <el-pagination layout="prev, pager, next" :total="docsContent" :page-size="5" @current-change="getCurrentPage" :current-page="currentPage"> </el-pagination>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script>
import Modal from '@/components/Modal/index'
import Button from '@/components/Button/index'
import { docList } from '@/common/api'
import { API_BASE } from '@/common/config'
export default {
  name: 'DocFileMenu',
  components: { Modal, Button },
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
  mounted() {},
  methods: {
    setDoc(doc) {
      this.$doc = doc
    },
    renderFileSrc(filename) {
      const suffix = filename.split('.').pop()
      let obj = {
        doc: 'word',
        docx: 'word',
        dot: 'word',
        word: 'word',
        xla: 'excel',
        xlc: 'excel',
        xlm: 'excel',
        xls: 'excel',
        xlsx: 'excel',
        xlt: 'excel',
        xlw: 'excel',
        excel: 'excel',
        pdf: 'pdf',
        ppt: 'ppt',
        pptx: 'ppt',
        pot: 'ppt',
        pps: 'ppt',
        jpg: 'png',
        jpeg: 'png',
        png: 'png',
        gif: 'png',
      }

      // let name = filename.substr(0, index + 1)
      return {
        filename,
        suffix,
        src: require(`@/assets/images/${obj[suffix]}@3x.png`),
      }
    },
    yulan(item) {
      this.addfileVisible = false
      this.$emit('needPreview', item)
    },
    yanshi(item) {
      this.addNewFile(item, 1)
      this.addfileVisible = false
    },
    closeAddFileModal() {
      this.addfileVisible = false
    },
    fileContList: function() {
      this.thumbnailShow = !this.thumbnailShow
    },
    async clooseFile(item) {
      this.changeViewDoc(item)
    },
    addFile() {
      this.addfileVisible = true
      this.updateDocList(this.currentPage)
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
      let data = await this.$doc.getThumbnailList({ id: item.cid })
      let list = data.find((el) => el.id == item.cid).list
      this.ThumbnailList = list
      this.activeThumbnail = list[0]
    },
    handleProgress(event, file, fileList) {
      this.uploadTxt = '上传中...'
    },
    handleSuccess(response, file, fileList) {
      this.$message.info('文档上传成功')
      this.uploadTxt = '上传文档'
      this.updateDocList()
    },
    handleError(err, file, fileList) {
      this.$message.error('文档上传失败')
      this.uploadTxt = '上传文档'
    },
    /**
     * 刷新文档列表
     */
    async updateDocList(page = 1) {
      const roomId = this.$store.state.room.roomId
      let { data, count } = await docList(roomId, page)
      console.log(count)
      this.docsContent = count
      this.tableData = data
    },
    getCurrentPage(currentPage) {
      this.currentPage = currentPage
      this.updateDocList(currentPage)
    },
    foramtPage(item) {
      let str = '0 / 0'
      str = `${item.slideIndex + 1} / ${item.slidesTotal}`
      this.pageString = str
      this.activeThumbnail = this.ThumbnailList[item.slideIndex]
    },
  },
  computed: {
    menuList: function() {
      return this.list.filter((item) => item.is_board == 1)
    },
    action: function() {
      return `${API_BASE}/api/v1/doc/create?roomId=${this.$store.state.room.roomId}`
    },
  },
  watch: {
    selectDoc: async function(item) {
      if (item.is_board == 2) return false
      if (item.cid) {
        if (this.allComplete) {
          await this.getThumbnailList(item)
          this.foramtPage(item)
        } else {
          this.queue.push({ fn: this.getThumbnailList.bind(this), data: item }, { fn: this.foramtPage.bind(this), data: item })
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
        this.queue.forEach(async ({ fn, data }) => {
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
    .table-box{
      min-height: 313px;
    }
    /deep/ .el-table_1_column_1  .cell{
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
