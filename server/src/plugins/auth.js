'use strict'
const net = require('net')
const _ = require('lodash')
const boom = require('@hapi/boom')
const isIpPrivate = require('private-ip')
const utils = require('../utils')
const { Sessions } = require('../models')
const internals = {}
const cookieName = 'token'
const oneDay = 1000 * 3600 * 24
const cookieOptions = {
  clearInvalid: true,
  ignoreErrors: true,
  // isSameSite: 'Lax',
  isSecure: false,
  ttl: oneDay * 365,
  path: '/'
}

internals.Session = class {
  constructor(request, settings, [session, name2id, session2Admin]){
    this._session = session
    this._name2id = name2id
    this._session2Admin = session2Admin
    this._request = request
    this._settings = settings
    this._roomId = null
    this.nickName = null
    this.isAdmin = false
    this.token = null
    this.identity = null
  }

  async _preInitialize(){
    const auth = this._request.auth
    this.token = auth.artifacts && auth.artifacts.token
    this._roomId = _.get(this._request, ['payload', 'roomId']) || this._request.query.roomId
  }

  async _initSession(){
    // if (this.token) return
    // const token = utils.randomId()
    // this.token = token
    // const option = {} // { isSecure: true, isSameSite: 'Lax' }
  }

  async _initialize(){
    const auth = this._request.auth
    const user = auth && auth.credentials || {}
    if (!(user && user.accountId)) return
    this.accountId = user.accountId
    this.nickName = user.nickName
    this.isAdmin = user.isAdmin || (auth.strategy === 'admin' && auth.mode === 'required')

    if (this.isAdmin) {
      this.identity = utils.INAV_IDENTITY.master
      return
    }

    // 房间身份
    if (this._roomId) {
      const info = await this._request.server.methods.room.getRoomInfo(this._roomId)
      if (info && info.masterId === this.accountId) this.identity = utils.INAV_IDENTITY.master
      if (info && info.helperId === this.accountId) this.identity = utils.INAV_IDENTITY.helper
      if (!this.identity) {
        const list = await this._request.server.methods.room.listRoomEnterUser(this._roomId).catch(() => [])
        const user = list.find(item => item.accountId === this.accountId)
        // const nickName = user.nickName || ''
        this.identity = user && user.identity || utils.INAV_IDENTITY.player
      }
    }
  }

  async saveAccountId(token, data){
    if (!(token && data)) return
    await this._session.set(token, data)
    // 反向检索
    await this._name2id.set(data.nickName, data.accountId)
    this.token = token
    this.nickName = data.nickName || '游客'
    this.accountId = data.accountId || ''
  }

  async saveAdminId(token, data){
    if (!(token && data)) return
    await this._session2Admin.set(token, data)
    this.token = token
    this.nickName = data.nickName || 'admin'
    this.accountId = data.accountId || 'admin'
  }

  async getAccountIdByName(nickName){
    return this._name2id.get(nickName)
  }

  async _getAccountByIdToken(token){
    if (!token) return null
    return this._session.get(token)
  }

  async _getAdminByIdToken(token){
    if (!token) return null
    return this._session.get(token)
  }

  // 保存信息到session
  async saveSession(){
    const info = this._fetchRequestUserInfo()
    const record = { ...info, from: 0, sid: this.token }
    await Sessions.upsert(record)
  }

  // 获取请求的info
  _fetchRequestUserInfo(){
    const info = {}
    info.ip = this._request.info.remoteAddress
    info.userAgent = _.truncate(this._request.headers['user-agent'], { length: 255, omission: '' })
    info.origin = _.truncate(this._request.headers.origin || this._request.url.toString(), { length: 255, omission: '' })

    try {
      const forwarded = _.split(this._request.headers['x-forwarded-for'])[0]
      const xIp = _.trim(this._request.headers['x-real-ip'] || (this._request.headers['x-forwarded-for'] && forwarded))
      if (xIp && net.isIP(xIp) && isIpPrivate(info.ip)) {
        info.ip = xIp
      }
    } catch (e) {
    }
    return info
  }
}

internals.onPreResponse = async function (request, h){
  return h.continue
}

internals.onPostAuth = async function (request, h){
  await request.user._preInitialize()
  await request.user._initSession()
  await request.user._initialize()
  return h.continue
}

internals.decorate = function (settings, caches){
  return function (request){
    return new internals.Session(request, settings, caches)
  }
}

internals.implementation = (server, options) => {
  const accessTokenName = 'token'
  const scheme = {
    authenticate: async (request, h) => {
      const isRequired = request.auth.mode === 'required'
      // headers token
      let authorization = request.raw.req.headers[accessTokenName]
      // cookie token
      // if (!authorization && request.state[accessTokenName]) authorization = request.state[accessTokenName]
      // query token
      if (!authorization && request.query[accessTokenName]) {
        authorization = request.query[accessTokenName]
        delete request.query[accessTokenName]
      }
      if (Array.isArray(authorization)) authorization = authorization[0]
      if (!authorization) authorization = ''
      const token = authorization.trim()
      // if (!authorization) return isRequired ? boom.unauthorized('需要先匿名登陆', ['token']) : h.continue
      // if (!token) return isRequired ? boom.unauthorized('需要先匿名登陆', ['token']) : h.continue

      // validate
      const { isValid, credentials, artifacts } = await options.validate(request, h, token)

      if (!isValid) return isRequired ? boom.unauthorized('需要先匿名登陆', ['token']) : h.continue
      return h.authenticated({ credentials, artifacts })
    }
  }
  return scheme
}

exports.plugin = {
  pkg: { name: 'session' },
  requirements: { node: '>= 8', hapi: '>=18' },
  register: async function (server, settings){
    server.state(cookieName, cookieOptions)
    const session = server.cache({ expiresIn: oneDay, shared: true })
    const session2Admin = server.cache({ segment: 'session.admin', expiresIn: oneDay, shared: true })
    const name2id = server.cache({ segment: 'name2id', expiresIn: oneDay, shared: true })
    server.decorate('request', 'user', internals.decorate(settings, [session, name2id, session2Admin]), { apply: true })
    server.ext('onPostAuth', internals.onPostAuth)
    server.ext('onPreResponse', internals.onPreResponse)

    server.auth.scheme('access-token', internals.implementation)
    // api token auth
    server.auth.strategy('api', 'access-token', {
      validate: async (request, h, token) => {
        const user = await request.user._getAccountByIdToken(token)
        const user1 = await request.user._getAdminByIdToken(token)
        if (user1) return { isValid: true, credentials: Object.assign({ isAdmin: true }, user1), artifacts: { token } }

        if (!user) return { isValid: false, credentials: {} }
        return { isValid: true, credentials: user, artifacts: { token } }
      },
    })
    // admin api token auth
    server.auth.strategy('admin', 'access-token', {
      validate: async (request, h, token) => {
        const user = await request.user._getAdminByIdToken(token)
        if (!user) return { isValid: false, credentials: {}, artifacts: { token } }
        user.isAdmin = true
        return { isValid: true, credentials: user, artifacts: { token } }
      },
    })
  }
}
