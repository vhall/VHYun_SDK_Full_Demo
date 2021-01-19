<template>
  <div class="fileList">
    <div class="addBorad" @click="open">
      <i class="iconfont iconicon-zengjiawendang"></i>
      <span>添加白板</span>
      <span class="shu"></span>
    </div>
    <div class="leftMenu">
      <div v-for="(item, index) in menuList" :key="item.cid" :class="['fileItem', item.cid === selectDoc.cid ? 'active' : '']" @click="clooseFile(item)">
        <span class="word">{{ item.cid }}</span>
        <i class="iconfont iconicon-guanbi iconClose" @click.stop="delFile(item, index)"></i>
        <i class="shu"></i>
      </div>
    </div>
    <div class="rightSet">
      <i :class="['iconfont', 'iconicon-fangda', activeSet == 'big' ? 'active' : '']" title="放大" @click="setFile('big')"></i>
      <i :class="['iconfont', 'iconicon-suoxiao', activeSet == 'small' ? 'active' : '']" title="缩小" @click="setFile('small')"></i>
      <i :class="['iconfont', 'iconicon-huanyuan']" title="还原" @click="setFile('reset')"></i>
      <i :class="['iconfont', 'iconicon-yidong', activeSet == 'move' ? 'active' : '']" title="移动" @click="setFile('move')"></i>
    </div>

    <Modal :visible="visible" :showFooter="true" @close="close" @sure="sure" title="创建白板" width="344px">
      <div class="BoardModalBox">
        <div class="boardItem">
          <span class="label">画笔类型</span>
          <el-select v-model="value" placeholder="请选择" class="cont">
            <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value"> </el-option>
          </el-select>
        </div>
        <div class="boardItem">
          <span class="label">选择颜色</span>
          <el-color-picker v-model="color"></el-color-picker>
        </div>
        <div class="boardItem">
          <span class="label">画笔颜色</span>
          <el-input class="cont" disabled v-model="color" />
        </div>
        <div class="boardItem">
          <span class="label">线条宽度</span>
          <el-input class="cont" maxlength="30" v-model="num" @keyup.native="inputLimit" />
        </div>
      </div>
    </Modal>
  </div>
</template>

<script>
import Modal from '@/components/Modal/index'

export default {
  name: 'DocBoardMenu',
  components: { Modal },
  props: ['changeViewDoc', 'list', 'selectDoc', 'delFile', 'addNewFile','allComplete'],
  data() {
    return {
      activeSet: null,
      visible: false,
      value: 'CANCEL',
      color: '#333333',
      num: 4,
      status: false,
      options: [
        {
          value: 'CANCEL',
          label: '无',
        },
        {
          value: 'PEN',
          label: '自由画笔',
        },
        {
          value: 'NITE_WHITE_PEN',
          label: '荧光笔',
        },
        {
          value: 'SQUARE',
          label: '矩形',
        },
        {
          value: 'CIRCLE',
          label: '椭圆',
        },
        {
          value: 'TEXT',
          label: '文字',
        },
        {
          value: 'ISOSCELES_TRIANGLE',
          label: '等腰三角形',
        },
        {
          value: 'RIGHT_TRIANGLE',
          label: '直角三角形',
        },
        {
          value: 'SINGLE_ARROW',
          label: '单箭头',
        },
        {
          value: 'DOUBLE_ARROW',
          label: '双箭头',
        },
      ],
      $doc: null,
    }
  },
  methods: {
    setDoc(doc) {
      this.$doc = doc
    },
    inputLimit(e) {
      this.num = e.target.value.replace(/[^\d.]/g, '')
      if (this.num > 30) {
        this.num = 30
      }
    },
    open() {
      this.visible = true
    },
    close() {
      this.visible = false
    },
    sure() {
      let query = {
        type: this.value || 'dysjx',
        color: this.color || '#333333',
        num: this.num || 2,
      }
      if (!this.num) {
        this.$message.error('请确定当前线条宽度')
        return false
      }
      this.addNewFile(query, 2)
      this.visible = false
    },
    async clooseFile(item) {
      this.changeViewDoc(item)
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
  },
  computed: {
    menuList: function() {
      return this.list.filter((item) => item.is_board == 2)
    },
  },
}
</script>

<style lang="less" scoped>
.fileList {
  height: 40px;
  background: #222;
  display: flex;
  padding: 0 8px;
  border-left: 1px black solid;
  border-right: 1px black solid;

  .addBorad {
    display: flex;
    align-items: center;
    color: #999;
    padding-left: 16px;
    cursor: pointer;
    > i {
      font-size: 12px;
      margin-right: 5px;
    }
    .shu {
      width: 1px;
      height: 16px;
      background: #363636;
      margin-left: 16px;
    }
    &:hover {
      background: #000;
      color: #1e90ff;
    }
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
    min-width: 170px;
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
.BoardModalBox {
  padding: 0px 32px;
  .boardItem {
    display: flex;
    align-items: center;
    margin-top: 16px;
    .label {
      width: 56px;
      font-size: 14px;
      color: #666;
      margin-right: 16px;
      height: 36px;
      line-height: 36px;
    }
    .cont {
      width: 208px;
      height: 36px;
      /deep/ .popper__arrow{
        display: none;
      }
    }
  }
}
</style>
