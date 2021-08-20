<template>
  <el-dialog
    :visible.sync="dialogShow"
    center
    :show-close="showClose"
    @opened="opened"
  >
    <div class="dialog-header">
      <h5>导入问题</h5>
      <span @click="hide" class="elicon el-icon-close"></span>
    </div>
    <div class="body">
      <div class="search">
        <el-input
          :placeholder="searchPlaceholder"
          v-model="keyword"
          class="input-with-select"
          @input="onInput"
        >
          <el-select
            v-model="select"
            slot="prepend"
            @change="selectChange"
            placeholder="请选择"
          >
            <el-option label="id" value="id"></el-option>
            <el-option label="title" value="title"></el-option>
            <el-option label="extension" value="extension"></el-option>
          </el-select>
          <el-button
            type="primary"
            slot="append"
            class="search-btn"
            @click="onSearch"
            >搜索</el-button
          >
        </el-input>
      </div>

      <el-table
        :data="tableData"
        class="table"
        ref="table"
        cell-class-name="table-cell"
        header-cell-class-name="table-head-cell"
      >
        <el-table-column
          label="问题ID"
          prop="id"
          min-width="120"
        ></el-table-column>
        <el-table-column
          label="问题描述"
          prop="title"
          min-width="200"
          show-overflow-tooltip
        ></el-table-column>
        <el-table-column label="操作">
          <template slot-scope="{ row }">
            <el-button type="text" @click="addQuestion(row)">添加</el-button>
            <el-button type="text" @click="delQuestion(row)">删除</el-button>
            <div>
              显示答案：<el-switch v-model="row.showAnswer"></el-switch>
            </div>
            <div>
              显示解析：<el-switch v-model="row.showAnalysis"></el-switch>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="pagination-wrapper" v-if="pagination">
      <el-pagination
        background
        :total="pagination['total']"
        @current-change="currentChange"
        :page-size="5"
        layout="prev, pager, next"
      ></el-pagination>
    </div>
  </el-dialog>
</template>
<script>
export default {
  data() {
    return {
      select: "id",
      searchPlaceholder: `请输入要搜索的id`,
      dialogShow: false,
      showClose: false,
      keyword: "",
      tableData: [],
      currentPage: 1,
      pagination: null
    };
  },
  methods: {
    onInput() {
      this.getList();
    },
    selectChange(res) {
      this.searchPlaceholder = `请输入要搜索的${res}`;
    },
    onSearch() {
      this.keyword && this.getList();
    },
    opened() {
      this.getList();
    },
    show() {
      this.dialogShow = true;
    },
    hide() {
      this.dialogShow = false;
      this.$emit("clear");
    },
    addQuestion: async function(data) {
      const { id, showAnswer, showAnalysis } = data;
      let info;
      try {
        info = await this.getQuestion({ id, showAnswer, showAnalysis });
      } catch (err) {
        this.$message.error(err.msg);
        return;
      }
      this.$emit("add", info);
    },
    getQuestion(opt) {
      return new Promise((resolve, reject) => {
        window.form.getQuestion(
          opt,
          res => {
            resolve(res);
          },
          err => {
            reject(err);
          }
        );
      });
    },
    delQuestion(data) {
      const { id } = data;
      window.form.deleteQuestion(
        { id },
        res => {
          this.$message({
            message: `删除成功`,
            type: "success"
          });
          this.getList(this.keyword);
        },
        err => {
          this.$message.error(err.msg);
        }
      );
    },
    currentChange(current) {
      this.currentPage = current;
      this.getList();
    },
    getList() {
      let params = {
        pageSize: 5,
        currPage: this.currentPage,
        types: [
          VhallForm.QUESTION_TYPE.AREA,
          VhallForm.QUESTION_TYPE.CHECKBOX,
          VhallForm.QUESTION_TYPE.DATE,
          VhallForm.QUESTION_TYPE.LINE,
          VhallForm.QUESTION_TYPE.MATRIX,
          VhallForm.QUESTION_TYPE.PAGE,
          VhallForm.QUESTION_TYPE.RADIO,
          VhallForm.QUESTION_TYPE.REMARK,
          VhallForm.QUESTION_TYPE.TEXT
        ]
      };
      params[this.select] = this.keyword;
      window.form.getQuestionList(
        params,
        res => {
          const data = [];
          for (const key in res.detail) {
            if (res.detail.hasOwnProperty(key)) {
              const item = res.detail[key];
              item["showAnswer"] = true;
              item["showAnalysis"] = true;
              data[key] = item;
            }
          }
          this.tableData = data;
          this.pagination = {
            total: res.total
          };
        },
        e => {
          console.error(e);
        }
      );
    }
  }
};
</script>
<style lang="scss" scoped>
@import "../assets/css/_varible.scss";
@import "../assets/css/cover-ele-style.scss";

/deep/.el-dialog--center {
  width: 891px;
  background: #f3f4f8;
  border-radius: $box-radius !important;
}

/deep/.el-dialog__header {
  padding: 0;
  background: #fff;
  border-top-left-radius: $box-radius;
  border-top-right-radius: $box-radius;
}

/deep/.el-dialog__body {
  padding: 0 !important;
}

.dialog-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 0;
  background: #fff;

  h5 {
    text-align: center;
    width: 100%;
    font-size: 16px;
    color: #555;
  }

  span {
    position: absolute;
    right: 20px;
    cursor: pointer;
  }

  .icon-danchuangguanbianniu:hover {
    color: $hover-color;
  }
}

.body {
  padding: 20px 40px;
}

/deep/ .el-pagination.is-background .el-pager li,
/deep/ .el-pagination.is-background .btn-prev,
/deep/ .el-pagination.is-background .btn-next {
  background: #fff;
  color: #999;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-bottom: 30px;
}

.search {
  display: inline-flex;
  align-items: center;
  box-shadow: $box-shadow;
  border-radius: $box-radius;
  background: #fff;
  width: 100%;
  .el-input {
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    .el-select {
      width: 130px;
      border: 0;
    }
  }

  .input-with-select .el-input-group__prepend {
    background-color: #fff;
  }
  .search-btn {
    color: #fff;
  }

  i {
    font-size: 17px;
    padding: 0 20px;
    color: #c0c0c0;
  }

  /deep/ .el-input {
    // width: 350px;

    /deep/ .el-input__inner {
      border: none;
      outline: none;
      // padding-left: 0;
      text-align: center;
    }
  }

  /deep/ .el-button {
    background: $color;
    font-size: 14px;
    line-height: 20px;
    width: 0px;
    width: 68px;
    padding: 10px 20px;
    border: none;
  }
}

@include cover-table();

.table {
  margin-top: 20px;

  .el-button--text {
    color: #1e89e4;
  }
}
</style>
