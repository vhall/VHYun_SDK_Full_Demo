'use strict'
const Hapi = require('@hapi/hapi')
const CatboxRedis = require('@hapi/catbox-redis')
const Config = require('getconfig')
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const util = require('util')
const {wait} = require('./utils')
const Package = require('../package.json')
const projectRoot = path.resolve(__dirname, '../')
Date.prototype.toJSON = function () { return this.valueOf() }
const corsOpt = {
  additionalHeaders: ['cache-control', 'pragma', 'upgrade-insecure-requests', 'origin', 'content-type', 'authorization'],
  credentials: true
}
let srv
let demoMode

// 设置服务器tls证书
async function stepTls(conf){
  if (conf.tls === false) {
    delete conf.tls
    return
  }
  const tlsCertPath = path.join(projectRoot, 'config/pem.crt')
  const tlsKeyPath = path.join(projectRoot, 'config/pem.key')
  const tls = {}

  // 如果没有配置ssl证书，则生成一个自签名证书
  if (!conf.tls) {
    const exists = fs.existsSync(tlsCertPath) && fs.existsSync(tlsKeyPath)
    if (!exists) {
      // 不存在保存的私钥/公钥，生成一个
      const pems = require('./utils').createCertificate()
      // 保存私钥
      fs.writeFileSync(tlsKeyPath, pems.private, { encoding: 'utf8' })
      // 保存公钥
      fs.writeFileSync(tlsCertPath, pems.cert, { encoding: 'utf8' })
      tls.key = pems.private
      tls.cert = pems.cert
    } else {
      tls.key = fs.readFileSync(tlsKeyPath, { encoding: 'utf8' })
      tls.cert = fs.readFileSync(tlsCertPath, { encoding: 'utf8' })
    }
  } else {
    tls.key = fs.readFileSync(conf.tls.key, { encoding: 'utf8' })
    tls.cert = fs.readFileSync(conf.tls.cert, { encoding: 'utf8' })
  }
  Config.server.tls = tls
}

async function setupEnv(srv, configs) {
  // env
  srv.app.paas = configs.paas
  srv.app.demoMode = demoMode
  srv.app.projectRoot = projectRoot
  const selfUri = srv.info.uri

  // 强制锁定到测试分支
  if (!configs.host) {
    const head = await util.promisify(fs.readFile)(path.join(projectRoot, '../.git/HEAD'), { encoding: 'utf8' }).catch(() => '')
    if (head) {
      if (head.indexOf('/test') >= 0) configs.getconfig.isDev = true
    }
  }

  // local
  if (configs.host) {
    srv.app.hostSdk = configs.host.hostSdk || 'https://static.vhallyun.com'
    srv.app.hostStatic = configs.host.hostStatic || 'http://localhost:8080'
    srv.app.hostSite = configs.host.hostSite || selfUri
  }

  // dev
  else if (configs.getconfig.isDev) {
    srv.app.hostSdk = 'https://static.vhallyun.com'
    srv.app.hostSite = 'https://test-demo.vhallyun.com'
    srv.app.hostStatic = 'https://t-static01-open.e.vhall.com/jssdk/vhall-jssdk-full-demo'
  }

  else {
    srv.app.hostSdk = 'https://static.vhallyun.com'
    srv.app.hostSite = 'https://demo.vhallyun.com'
    srv.app.hostStatic = 'https://static.vhallyun.com/jssdk/vhall-jssdk-full-demo'
  }
}

async function init(){
  const configs = _.cloneDeep(Config)
  demoMode = configs.database && configs.database.dialect === 'sqlite'

  // 服务需要使用https访问，设置tls
  if (configs.server.tls !== false) {
    await stepTls(configs.server)
  } else {
    configs.server.tls = undefined
  }

  // 服务器配置，演示模式下使用内存缓存（注意，不要将演示模式用于任何正式环境）
  const options = {
    routes: {
      cors: corsOpt,
      security: { hsts: false, xframe: 'sameorigin', xss: true, noOpen: true, noSniff: true },
    },
    state: { ignoreErrors: true, encoding: 'none' },
  }
  options.load = { sampleInterval: 500, concurrent: 500, maxEventLoopDelay: 3000 }
  options.operations = { cleanStop: false }
  if (!demoMode && configs.redis && configs.redis.host) options.cache = { provider: { constructor: CatboxRedis, options: configs.redis } }

  srv = Hapi.server(Object.assign(configs.server, options))

  // env
  await setupEnv(srv, configs)

  // 初始化数据库连接
  await srv.register({ plugin: require('./plugins/log'), options: configs.logs })

  // 初始化数据库连接
  await srv.register({ plugin: require('./plugins/db'), options: configs.database })
  // session设置
  await srv.register({ plugin: require('./plugins/auth'), options: configs.auth })
  // paas注册method调用
  await srv.register({ plugin: require('./plugins/paas'), options: configs.paas })
  // 注册定时任务
  await srv.register({ plugin: require('./plugins/task'), options: configs.paas })
  // 注册响应转换方法
  await srv.register({ plugin: require('./plugins/jdata-toolkit'), options: {} })
  // 注册room操作方法
  await srv.register({ plugin: require('./plugins/room'), options: {} })
  // 注册
  await srv.register({ plugin: require('./plugins/tiny-cache'), options: {} })

  // 演示模式，序列化/反序列化cache数据
  if (demoMode) await srv.register({ plugin: require('./plugins/memory-serialize'), options: {} })

  // 同步数据库
  if (srv.db) {
    // 同步数据表，其他模式需要手动同步数据库
    if (demoMode) await srv.db.sync({ force: false })
  }

  // 注册路由
  await srv.register({ plugin: require('./v1'), options: {} })

  // 设置定时任务，正式使用建议使用自己的定时任务平台
  require('./schedule')(srv, configs.schedule)

  global['srv'] = srv
}

async function start(){
  try {
    // 初始化
    await init()
  } catch (e) {
    process.stderr.write('init server fail. ' + util.inspect(e) + ' \n')
    process.exit(1)
  }

  try {
    // 启动服务器
    await srv.start()
  } catch (e) {
    process.stderr.write('start server fail. ' + util.inspect(e) + ' \n')
    process.exit(1)
  }

  // 注册未捕获异常
  process.on('unhandledRejection', err => {
    srv.log(['error', 'unhandledRejection'], err)
  })
  process.on('uncaughtException', err => {
    srv.log(['error', 'uncaughtException'], err)
  })

  async function shutdown () {
    process.stdout.write('shutdown app...\n')
    process.off('SIGINT', shutdown)
    process.off('SIGTERM', shutdown)
    srv.stop()
    await wait( 200)
    process.exit(0)
    process.abort()
  }

  // 注册停止服务器事件
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  process.stdout.write(`${Package.name} Server running at ${srv.info.uri}\n`)
}

exports.start = start
