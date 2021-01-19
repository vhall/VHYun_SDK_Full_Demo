<template>
  <div class="menusBox">
    <div class="chapter" v-for="item in list" :key="item.cid">
      <div class="chapter-box" @click="turnTime(item)">
        <span class="xuhao">{{ item.slideIndex }}</span>
        <span class="title">{{ item.title }}</span>
      </div>
      <div class="chapter-box" v-for="citem in item.sub" :key="citem.stepIndex" @click="turnTime(citem)">
        <span class="xuhao">{{ item.slideIndex }}-{{ citem.stepIndex }}</span>
        <i class="iconfont iconicon-jinyan"></i>
        <span class="title">{{ citem.title }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DocMenusBox',
  components: {},
  data: function() {
    return {
      list: [
        {
          cid: 'cossj-kksksksk',
          docId: 'sskkjkljlkjklj',
          slideIndex: 1,
          stepIndex: 0,
          title: '第一章',
          sub: [
            {
              slideIndex: 1,
              stepIndex: 1,
              title: '第一章第一子章节'
            }
          ]
        },
        {
          cid: 'cossj-sas;lkl;k;lk;lk',
          docId: 'sskkjkljlkjklj',
          slideIndex: 2,
          stepIndex: 1,
          title: '第二章',
          sub: [
            {
              slideIndex: 1,
              stepIndex: 1,
              title: '第二章第一子章节'
            }
          ]
        }
      ]
    }
  },
  methods: {
    turnTime(item) {
      if (process.env.NODE_ENV !== 'production') console.log(item)
    }
  },
  watch: {}
}
</script>

<style lang="less" scoped>
.menusBox {
  display: flex;
  flex-direction: column;
  height: calc(~'100vh - 265px');
  min-height: 400px;
  overflow: auto;
  .chapter-box {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0px 16px;
    font-size: 14px;
    color: #f7f7f7;
    .xuhao {
      margin-right: 16px;
    }
    > i {
      margin-right: 8px;
    }
    &:hover {
      background: #252525;
    }
  }
}
</style>
