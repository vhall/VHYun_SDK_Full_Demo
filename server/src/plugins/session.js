'use strict'
const _ = require('lodash')
const yar = require('@hapi/yar')

exports.plugin = {
  pkg: { name: 'session' },
  requirements: { node: '>= 8', hapi: '>=18' },
  register: async function (server, settings){
    const password = ' '.repeat(30)
    // 第三方cookie，如果设置成None,必须配合设置isSecure一起用 (否则有问题)
    const isSameSite = 'None'
    const isSecure = true
    const options = {
      name: 'sid',
      // 服务端存储session
      maxCookieSize: 0,
      cache: { expiresIn: 1000 * 3600 },
      cookieOptions: {
        clearInvalid: true,
        ignoreErrors: true,
        path: '/',
        password: password,
        isSameSite: isSameSite,
        isSecure: isSecure,
        isHttpOnly: true,
        ttl: 1000 * 3600 * 24 * 365 * 10
      },
      ...settings
    }
    // Access-Control-Allow-Credentials 需要指定 Access-Control-Allow-Origin
    await server.register({ plugin: yar, options })
    if (server.states.cookies['sid']) server.states.cookies['sid'].encoding = 'base64json'
  }
}
