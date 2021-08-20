<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style lang="less">
body {
  -ms-overflow-style: none;
  overflow: -moz-scrollbars-none;
}
body::-webkit-scrollbar {
  display: none;
  width: 0 !important;
}
.hidden {
  visibility: hidden;
}
body{
  background-color: #f4f8fe;
  /deep/ .el-select-dropdown.el-popper .popper__arrow{
    display: none;
  }
}
#app {
  color: #fff;
  overflow: hidden;
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
