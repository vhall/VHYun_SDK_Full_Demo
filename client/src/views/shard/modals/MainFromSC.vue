<template>
  <div>
    <div class="from-content-list" v-show="!previewFormId && !addFormVisible">
      <div class="form-list-warp" v-show="!addFormVisible">
        <i class="form-close elicon el-icon-close" @click="onCloseForm"/>
        <h2>表单列表</h2>
        <div class="form-list-action">
          <Button class="live_btn" type="primary" @click="addForm">新建表单</Button>
        </div>
        <div class="form-list-table">
          <el-table :data="tableData" style="width: 100%">
            <el-table-column prop="formId" label="表单id" width="120"/>
            <el-table-column prop="title" label="标题" min-width="180"/>
            <el-table-column prop="set" label="操作">
              <template slot-scope="scope">
                <span class="fileSetSpan" @click="previewForm(scope.row)">预览</span>
                <span class="fileSetSpan" @click="editForm(scope.row)" v-if="scope.row.status===1">编辑</span>
                <span class="fileSetSpan" @click="sendForm(scope.row)" v-if="scope.row.status===1">发送</span>
                <span class="fileSetSpan disabled" v-if="scope.row.status===2">已发送</span>
                <span class="fileSetSpan" @click="lookupAnswer(scope.row)" v-if="scope.row.status===2">查看答卷</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination">
            <el-pagination
              layout="prev, pager, next" :total="formTotal" :page-size="pageSize"
              @current-change="fetchList" :current-page="currentPage"/>
          </div>
        </div>
      </div>
    </div>
    <div class="from-content-add" v-show="!previewFormId && addFormVisible">
      <div class="form-add-warp" v-if="addFormVisible">
        <i class="form-edit-back elicon el-icon-back" @click="onEditFormBack"/>
        <i class="form-close elicon el-icon-close" @click="onCloseForm"/>
        <h2>{{ addFormEditId ? '编辑表单' : '创建表单' }}</h2>
        <FormCreate :submitCreate="submitCreate" :editId="addFormEditId" :editFormData="editFormData"/>
      </div>
    </div>
    <div class="from-content-preview" v-if="previewFormId">
      <i class="form-preview-back elicon el-icon-back" @click="onPreviewBack"/>
      <i class="form-close elicon el-icon-close" @click="onCloseForm"/>
      <h2>预览</h2>
      <iframe :src="previewFormURL" frameborder="0" width="100%" style="width: 100%;height: 600px"></iframe>
    </div>
  </div>
</template>

<script>

import Button from '@/components/Button/Button'
import FormCreate from './FormCreate'
import {inavApi, roomApi, rsApi} from '@/common/api'
import {BUS_LOCAL_EVENTS} from '@/common/contant'

let first = true
export default {
  name: 'MainFromSC',
  components: {Button, FormCreate},
  data: () => ({
    tableData: [],
    formTotal: 0,
    currentPage: 1,
    pageSize: 8,
    addFormVisible: false,
    addFormEditId: 0,
    addFormEditFormId: '',
    previewFormId: 0,
    previewFormURL: '',
    editFormData: null,
  }),
  errorCaptured(err, vm, info) {
    console.log(`cat EC: ${err.toString()}\n info: ${info}`)
    return false
  },
  mounted() {
    setTimeout(() => this.fetchList(), first ? 500 : 0)
    if (first) first = false
    document.body.style.overflow = 'hidden'
  },
  created() {
    // 刷新列表
    this.$root.$on(BUS_LOCAL_EVENTS.RESOURCE_CHANGE, (data) => {
      if (!data || data.resource !== 'form') return
      if (this.previewFormId || this.addFormVisible) return
      this.fetchList()
    })
    if (typeof VhallForm !== 'undefined' && !window.form) {
      const formOpt = {
        appId: this.$store.state.sdkOption.appId,
        accountId: this.$store.state.sdkOption.accountId,
        token: this.$store.state.sdkOption.token
      }
      VhallForm.createInstance(formOpt,
        res => window.form = res.interface,
        err => {
          this.$message.error('表单sdk初始化失败')
          console.error(err)
        }
      )
    }
  },
  beforeDestroy() {
    document.body.style.overflow = ''
    window.form = null
  },
  computed: {
    roomId() {
      return this.$store.getters.roomId
    }
  },
  methods: {
    async fetchList(page = 1) {
      const rs = await rsApi.formList(this.roomId, page, this.pageSize)
      this.formTotal = rs.count || 0
      this.currentPage = page
      this.tableData = rs.data
    },
    addForm() {
      this.addFormVisible = true
    },
    onCloseForm() {
      this.$emit('close')
    },
    onEditFormBack() {
      this.editFormData = null
      this.addFormEditId = 0
      this.addFormVisible = false
    },
    onPreviewBack() {
      this.previewFormId = 0
    },
    async editForm(row) {
      const id = row && row.id
      if (!id) return
      const formId = row.formId
      this.editFormData = await rsApi.formFetch(this.roomId, id, formId)
      this.addFormEditId = id
      this.addFormVisible = true
    },
    closeAddFormModal() {
      this.addFormVisible = false
    },
    async sendForm(row) {
      const id = row && row.id
      if (!id) return
      const formId = row.formId
      try {
        const data = await inavApi.sendForm(id, formId)
        if (data.sendToChatCustom) await this.$store.dispatch('sendForm', data.sendToChatCustom)
      } catch (e) {
        this.$message.error(e.message)
      }
      this.$message.success('表单发送成功')
      await this.$nextTick()
      await this.fetchList()
    },
    // 查看答卷
    lookupAnswer(row) {
      const el = document.createElement('a')
      el.download = 'download'
      el.style.position = 'absolute'
      el.style.left = '-999px'
      el.style.top = '-999px'
      el.href = rsApi.lookupAnswer(this.roomId, row.id, row.formId)
      document.body.appendChild(el)
      el.click()
      setTimeout(() => el.remove(), 500)
    },
    previewForm(row) {
      const id = row && row.id
      if (!id) return
      this.previewFormId = id
      this.previewFormURL = rsApi.previewUrl(row.previewURL) + '&token=' + token
    },
    async submitCreate(question, id) {
      if (!question) {
        this.addFormVisible = false
        this.addFormEditId = 0
        return
      }

      if (id) {
        // 更新
        await rsApi.formUpdate(this.roomId, id, question)
        this.addFormVisible = false
        this.addFormEditId = 0
        await this.fetchList()
        return
      }

      await rsApi.formCreate(this.roomId, question)
      this.addFormVisible = false
      this.addFormEditId = 0
      await this.fetchList()
    },
  },
}
</script>

<style lang="less" scoped>
.from-content-list {
  min-width: 800px;
  min-height: 500px;
  max-height: 90%;
  width: fit-content;
  height: fit-content;
  position: relative;
  background-color: white;
  border-radius: 8px;

  .form-list-warp {
    margin: 0;
    padding: 0 32px;

    .form-close {
      position: absolute;
      right: 8px;
      top: 8px;
      font-size: 22px;
      cursor: pointer;
    }

    .form-list-action {
      margin-bottom: 10px;
    }

    h2 {
      padding: 10px 0;
      font-size: 22px;
      text-align: center;
      margin-bottom: 30px;
    }
  }

  .form-list-table {
    /deep/ .el-table_1_column_1 .cell {
      padding-left: 32px;
    }

    .fileSetSpan.disabled {
      cursor: unset;
      color: #F59A23;
      &:hover {
        color: #F59A23;
      }
    }

    .fileSetSpan {
      cursor: pointer;
      display: inline-block;
      color: #1E89E4;
      margin-right: 8px;

      &:hover {
        color: #1e90ff;
      }
    }
  }
}

.from-content-add {
  min-width: 960px;
  min-height: 600px;
  max-height: 760px;
  max-height: 95vh;
  width: fit-content;
  position: relative;
  border-radius: 4px;
  overflow: hidden;
  height: ~'max(760px, 95vh)';

  .form-add-warp {
    //margin: 0 8px;
    height: 100%;
    overflow: hidden;

    .form-close {
      position: absolute;
      right: 8px;
      top: 8px;
      font-size: 22px;
      cursor: pointer;
    }

    .form-edit-back {
      position: absolute;
      left: 8px;
      top: 8px;
      font-size: 22px;
      cursor: pointer;
    }

    h2 {
      padding: 10px 0;
      font-size: 22px;
      text-align: center;
      background-color: white;
      //border-radius: 4px;
    }
  }

}

.from-content-preview {
  min-width: 800px;
  min-height: 590px;
  max-height: 90%;
  width: fit-content;
  height: fit-content;
  position: relative;
  background-color: white;
  border-radius: 3px;

  .form-preview-back {
    position: absolute;
    left: 8px;
    top: 8px;
    font-size: 22px;
    cursor: pointer;
  }

  .form-close {
    position: absolute;
    right: 8px;
    top: 8px;
    font-size: 22px;
    cursor: pointer;
  }

  h2 {
    padding: 10px 0;
    font-size: 22px;
    text-align: center;
    display: none;
  }

  iframe {
    width: 100%;
    min-height: 560px;
  }
}
</style>
