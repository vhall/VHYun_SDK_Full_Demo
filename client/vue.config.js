module.exports = {
  publicPath: process.env.VUE_APP_PUBLIC_PATH || './',
  filenameHashing: true,
  productionSourceMap: true,
  chainWebpack: config => {
    // test 环境
    config.when(process.env.NODE_ENV === 'test', config => {
      // 移除 preload
      config.plugins.delete('preload')
      // 支持 hash，避免缓存造成的问题
      config.plugin('html').tap(options  => {
        if (options[0]) options[0].hash= true
        return options
      })
    })
  }
}
