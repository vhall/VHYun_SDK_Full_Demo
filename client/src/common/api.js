import axios from 'axios'
import * as qs from 'querystring'
import { API_BASE } from '@/common/config'
import sendBeacon from '@/utils/sendBeacon'

async function _request_post (path, body) {
  let res
  try {
    res = await axios({ method: 'post', baseURL: API_BASE, url: path, withCredentials: true, data: body, timeout: 20000, json: true })
  } catch (e) {
    if (!e.response?.data?.statusCode) { throw e }
    res = e.response
  }
  if (res.data.statusCode !== 200) {
    const err = new Error(res.data.message)
    err.resp = res
    throw err
  }
  return res.data
}
async function _request_get (path, params) {
  let res
  try {
    res = await axios({ method: 'get', baseURL: API_BASE, url: path, withCredentials: true, timeout: 15000, params: params })
  } catch (e) {
    if (!e.response?.data?.statusCode) { throw e }
    res = e.response
  }
  if (res.data.statusCode !== 200) {
    const err = new Error(res.data.message)
    err.resp = res
    throw err
  }
  return res.data
}

// 房间初始化信息检查
export const roomInit = async (title, roomId) => {
  const res = await _request_get('/api/v1/room/init', { title, roomId })
  return res.data
}

// 房间创建
export const roomCreate = async (title, username, identity = '') => {
  const res = await _request_post('/api/v1/room/create', { title, username, identity })
  return res.data
}

// 进入房间
export const roomEnter = async (roomId, username, identity) => {
  const res = await _request_post('/api/v1/room/enter', { roomId, username, identity })
  return res.data
}

// 用户列表
export const roomOnlineUser = async (roomId, page, limit) => {
  const res = await _request_get('/api/v1/room/onlineUser', { roomId, page, limit })
  return res
}

// 被踢出用户列表
export const roomKickUserList = async (roomId, page, limit) => {
  const res = await _request_get('/api/v1/room/roomKickList', { roomId, page, limit })
  return res
}

// 踢出用户
export const roomKickUser = async (roomId, userId) => {
  const res = await _request_post('/api/v1/room/kickUser', { roomId, userId })
  return res
}

// 取消踢出用户
export const roomUnKickUser = async (roomId, userId) => {
  const res = await _request_post('/api/v1/room/unkickUser', { roomId, userId })
  return res
}

// 旁路
export const roomAnother = async (roomId, open, maxScreenStream, time, layout ) => {
  const data = await _request_post('/api/v1/room/another', { roomId, open, maxScreenStream, layout, time })
  return data
}

// 关闭旁路 (unload专用)
export const sendBeaconAnother = async (roomId) => {
  const data = await sendBeacon(API_BASE + '/api/v1/room/another', { roomId, open: false, unload: true })
  return data
}

export const invaStreamDown = async (roomId, identity, userId, targetId) => {
  const data = await _request_post('/api/v1/room/invaStreamDown', { roomId, userId, identity, targetId })
  return data
}

// 房间报告 (报告互动出错之类的，方便查问题)
export const roomReport = (roomId, data) => {
  _request_get('/api/v1/room/report', { roomId, ...data })
}

// 文档列表
export const docList = async (roomId, page = 1, limit = 5) => {
  return await _request_get('/api/v1/doc/list', { roomId, limit, page })
}
