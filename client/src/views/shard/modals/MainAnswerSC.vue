<template>
  <div>
    <div class="from-content-list" v-show="!answerURL">
      <div class="form-list-warp">
        <i class="form-close elicon el-icon-close content-back" @click="$emit('close')"/>
        <h2 class="title">表单列表</h2>
        <div class="form-list-table">
          <el-table :data="listData" style="width: 100%">
            <el-table-column prop="formId" label="表单id" width="120"/>
            <el-table-column prop="title" label="标题" min-width="180"/>
            <el-table-column prop="title" label="状态" min-width="120">
              <template slot-scope="scope">
                <span class="answer-status-1" v-if="scope.row.status === 1">未填写</span>
                <span class="answer-status-2" v-if="scope.row.status !== 1">已填写</span>
              </template>
            </el-table-column>
            <el-table-column prop="set" label="操作">
              <template slot-scope="scope">
                <span class="fileSetSpan" @click="answerForm(scope.row)" v-if="scope.row.status === 1">填写</span>
                <span class="fileSetSpan" @click="answerForm(scope.row)" v-if="scope.row.status !== 1">查看</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination">
            <el-pagination
              layout="prev, pager, next" :total="list.length" :page-size="pageSize"
              @current-change="page => this.currentPage = page" :current-page="currentPage"/>
          </div>
        </div>
      </div>
    </div>
    <div class="answer-content" v-show="answerURL">
      <i class="content-back elicon el-icon-back" @click="onBack" v-show="showBack"/>
      <i class="content-close elicon el-icon-close" @click="onClose"/>
      <h2 class="title">{{answerTitle}}</h2>
      <div>
        <iframe v-if="answerURL" :src="answerURL" frameborder="0" width="100%" style="width: 100%;height: 600px" ref="answer"></iframe>
      </div>
    </div>
  </div>
</template>

<script>
import {inavApi} from '@/common/api'

let first = true
export default {
  name: 'MainAnswerSC',
  components: {},
  props: ['answer'],
  data: () => ({
    list: [],
    currentPage: 1,
    pageSize: 6,
    currentAnswer: null,
    showBack: false,
  }),
  async mounted() {
    this.list = await inavApi.formList().catch(() => [])
    if (this.list.length <= 1) {
      this.currentAnswer = this.answer
    } else {
      this.showBack = true
    }
    document.body.style.overflow = 'hidden'
  },
  beforeDestroy() {
    document.body.style.overflow = ''
  },
  computed: {
    listData() {
      return this.list.slice(this.pageSize * (this.currentPage - 1), this.pageSize * this.currentPage)
    },
    answerURL() {
      const u = this.currentAnswer && this.currentAnswer.answerPage || ''
      if (!u) return u
      return u + '&token=' + (window.token || '')
    },
    answerTitle() {
      const t = this.currentAnswer && this.currentAnswer.title
      return t ? ('填写表单：' + t) : '填写表单'
    },
    roomId() {
      return this.$store.state.room.roomId
    },
  },
  watch: {
    // answerURL() {
    //   const close = async () => {
    //     await wait(3000)
    //     this.onClose()
    //   }
    //   try {
    //     this.$refs.answer.contentWindow.saveCallback = close
    //   } catch (e) { /**/ }
    // }
  },
  methods: {
    async onBack() {
      this.list = await inavApi.formList().catch(() => [])
      this.currentAnswer = null
    },
    onClose() {
      this.$emit('close')
    },
    answerForm(row) {
      this.currentAnswer = row
    },
  },
}
</script>

<style lang="less" scoped>
.answer-content {
  min-width: 960px;
  min-height: 600px;
  max-height: 90%;
  width: fit-content;
  height: fit-content;
  position: relative;
  background-color: #f2f2f2;
  border-radius: 3px;

  .content-back {
    position: absolute;
    left: 8px;
    top: 8px;
    font-size: 22px;
    cursor: pointer;
  }

  .content-close {
    position: absolute;
    right: 8px;
    top: 8px;
    font-size: 22px;
    cursor: pointer;
  }

  h2.title {
    padding: 10px 0;
    font-size: 22px;
    text-align: center;
    display: none;
  }
}
.from-content-list {
  min-width: 800px;
  min-height: 500px;
  max-height: 90%;
  width: fit-content;
  height: fit-content;
  position: relative;
  background-color: white;
  border-radius: 8px;
  padding: 0 20px;

  .content-back {
    position: absolute;
    right: 8px;
    top: 8px;
    font-size: 22px;
    cursor: pointer;
  }

  h2.title {
    padding: 10px 0;
    font-size: 22px;
    text-align: center;
  }

  .form-list-table {
    /deep/ .el-table_1_column_1 .cell {
      padding-left: 32px;
    }

    .answer-status-2 {
      cursor: unset;
      color: #97a0ac;
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
</style>
