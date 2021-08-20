'use strict'
const fs = require('fs')
const path = require('path')
const { Sequelize, Transaction } = require('sequelize')
const _ = require('lodash')
const models = require('../models')
const internals = {}

// 数据库连接池
const pool = {
  min: 2,
  max: 5,
  idle: 30000,
  acquire: 60000
}
const define = {
  // 数据库编码
  charset: 'utf8',
  // 数据表带时间
  timestamps: true,
  // 使用下划线
  underscored: true,
  // 冻结表名，不转换复数单词
  freezeTableName: true
}

// 连接到数据库
internals.connection = function (settings, projectRoot, log){
  // 选项参见文档：https://sequelize.org/master/class/lib/sequelize.js~Sequelize.html#instance-constructor-constructor
  const options = _.assign({
    isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    native: true,
    dialectOptions: {
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    define,
    pool
  }, settings)
  const dialect = settings.dialect
  // 非演示模式禁用sql日志打印
  if (!log && dialect !== 'sqlite') {
    options.logging = false
  }
  // 使用日志打印，不直接输出到stdout
  if (log) options.logging = log

  const isSqliteFile = dialect === 'sqlite' && (settings.storage !== '' || settings.storage !== ':memory:')
  // 解析sqlite文件的位置，位置设置为相对于项目目录
  const filepath = path.isAbsolute(settings.storage) ? settings.storage : path.join(projectRoot, settings.storage)
  options.storage = filepath

  // node8及以下Sequelize自动创建目录有问题，这里手工修复一下
  if (_.toInteger(_.split(process.versions.node, '.')[0]) <= 8 && isSqliteFile) {
    // 读写模式，但不会自动创建文件
    options.dialectOptions.mode = require(options.dialectModule || 'sqlite3').OPEN_READWRITE
    try {
      // 创建目录
      fs.mkdirSync(path.dirname(filepath), { recursive: true })
    } catch (e) {
      // do noting....
    }
    try {
      // 创建空文件，这不会导致文件删除
      fs.closeSync(fs.openSync(filepath, 'a'))
    } catch (e) {
      // do noting....
    }
  }
  // 初始化orm库
  return new Sequelize(options)
}

exports.plugin = {
  pkg: { name: 'db' },
  register: async function (server, options){
    const log = (sql, opt) => server.log(['info', 'sequelize'], sql)
    const db = internals.connection(options, server.app.projectRoot, log)
    // 验证数据库连接
    await db.authenticate()
    // 初始化模型
    models.init(db, db.options.dialect === 'mysql')
    // 注册db对象访问
    server.decorate('request', 'db', () => db, { apply: true })
    server.decorate('server', 'db', db, { apply: true })
  }
}
