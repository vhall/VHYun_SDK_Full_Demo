'use strict'
const Url = require('url')
const _ = require('lodash')
const wreck = require('@hapi/wreck')
const oneHours = 1000 * 3600
const internals = {}

internals.getTokenOrCache = async function (name, accountId, option) {
  const cacheKey = ['token', name, accountId].join('.')
  try {
    const token = await internals._cacheSmall.get(cacheKey)
    if (token) return token
  } catch (e) { /**/ }
  const token = await internals._methods.paas.createPaasToken(accountId, option)
  try {
    await internals._cacheSmall.set(cacheKey, token)
  } catch (e) { /**/ }
  return token
}

internals.getPageOrCache = async function (url, options) {
  options = options || {}
  if (options.baseUrl) url = url ? Url.format(new Url.URL(url, options.baseUrl)) : options.baseUrl;
  delete options.baseUrl
  const cacheKey = ['page', url].join('.')
  try {
    const body = await internals._cacheSmall.get(cacheKey)
    if (process.platform !== 'darwin' && body) return body
  } catch (e) { /**/ }
  if (typeof options.timeout !== 'number') options.timeout = 3000
  if (typeof options.redirects !== 'number') options.redirects = 3
  const rs = await wreck.get(url, options).catch(e => { e.url = url; e.options = options; return Promise.reject(e) })
  if (!(rs && rs.payload)) return rs && rs.payload
  let text = rs.payload
  try {
    text = new TextDecoder().decode(rs.payload)
    await internals._cacheSmall.set(cacheKey, text)
  } catch (e) { /**/ }
  return text
}

internals.setTinyCache = async function (key, body) {
  await internals._cacheTiny.set(key, body)
}

internals.getTinyCache = async function (key) {
  return await internals._cacheTiny.get(key)
}

internals.dropTinyCache = async function (key) {
  return await internals._cacheTiny.drop(key)
}

internals.setSmallCache = async function (key, body) {
  await internals._cacheSmall.set(key, body)
}

internals.getSmallCache = async function (key) {
  return await internals._cacheSmall.get(key)
}

internals.dropSmallCache = async function (key) {
  return await internals._cacheSmall.drop(key)
}

exports.plugin = {
  pkg: { name: 'tiny-cache' },
  register: async function (server, options){
    internals._methods = server.methods
    internals._cacheSmall = server.cache({ segment: 'small', expiresIn: oneHours * 0.5 })
    internals._cacheTiny = server.cache({ segment: 'tiny', expiresIn: oneHours * 0.05 })

    for (const method of _.keys(internals)) {
      if (typeof internals[method] !== 'function') continue
      server.method('tinyCache.' + method, internals[method], {})
    }
  }
}
