module.exports = {
  publicPath: process.env.VUE_APP_PUBLIC_PATH || './',
  filenameHashing: true,
  productionSourceMap: true,
  configureWebpack: {
    devServer: {
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  },
  chainWebpack: config => {
    config.output.filename('js/[name].[hash:8].js').end()
    config.output.chunkFilename('js/[name].[hash:8].js').end()
  },
  pages: {
    // 互动
    index: {
      entry: 'src/main.js',
      template: 'public/index.html',
      filename: 'index.html',
    },
    // 互动
    'index-h5': {
      entry: 'src/main-h5.js',
      template: 'public/index_h5.html',
      filename: 'index_h5.html',
    },
    // 表单
    answer: {
      entry: 'src/answer.js',
      template: 'public/answer.html',
      filename: 'answer.html',
      title: '表单',
    }
  }
}
