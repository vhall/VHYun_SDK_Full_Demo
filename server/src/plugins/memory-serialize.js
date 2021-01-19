'use strict'
const v8 = require('v8')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const serializeFilePath = 'config/cache.bin'
const internals = {}

internals.onPostStart = async function (server){
  const _serializeFilePath = path.join(server.app.projectRoot, serializeFilePath)
  internals.cache = server.cache({ segment: '__dump__' })
  if (!fs.existsSync(_serializeFilePath)) return
  try {
    const buf = fs.readFileSync(_serializeFilePath)
    const data = v8.deserialize(buf)
    if (!data) return
    if (!internals.cache._cache.connection.cache instanceof Map) return
    internals.cache._cache.connection.cache = data
  } catch (e) {
    // do nothing
  }
}

internals.onPreStop = async function (server){
  if (!internals.cache) return
  if (!(internals.cache._cache && internals.cache._cache.connection && internals.cache._cache.connection.cache)) return
  try {
    const _serializeFilePath = path.join(server.app.projectRoot, serializeFilePath)
    const data = v8.serialize(internals.cache._cache.connection.cache)
    fs.writeFileSync(_serializeFilePath, data)
  } catch (e) {
    console.log('writeFile Error', e)
  }
}

/**
 * 警告！！！警告！！！警告！！！
 * 此插件模块仅为了方便演示模式中，暂时不方便搭建环境的时候使用
 * 请勿在正式环境中使用，务必使用redis来做缓存，否则后果自负
 */
exports.plugin = {
  pkg: { name: 'memory-serialize' },
  requirements: { node: '>= 8', hapi: '>=18' },
  register: async function (server, settings){
    process.stderr.write('警告：内存缓存仅适用于演示模式中，建议配置使用redis用作缓存.\n')
    server.ext({ type: 'onPostStart', method: internals.onPostStart })
    server.ext({ type: 'onPreStop', method: internals.onPreStop })
  }
}
