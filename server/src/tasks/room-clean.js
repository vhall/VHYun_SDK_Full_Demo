'use strict'
const _ = require('lodash')
const {Op} = require('sequelize')
const {Rooms} = require('../models')

const oneDay = 1000 * 3600 * 24

async function findRoomByRange (start, end) {
  const where = { updatedAt: { [Op.between]: [start, end] } }
  const rooms = await Rooms.findAll({ attributes: ['id'], where })
  return _.map(rooms, 'id')
}

async function roomClean(server, params) {
  const day = params && params.day || 7
  const range = params && params.range || 3
  const end = new Date(Date.now() - oneDay * day)
  const start = new Date(end.getTime() - oneDay * range)
  const ids = Array.isArray(params.ids) ? params.ids : await findRoomByRange(start, end)
  for (const id of ids) {
    try {
      const room = await server.methods.room.getRoom(id)
      if (!room) continue
      if (room.paasInavId) {
        const status = await server.methods.paas.getIlsStatus(room.paasInavId).catch(e => null)
        // 这个房间正在推流中，跳过，不删除房间
        if (status === 1) continue
      }
      // if (room.paasLiveId) {}

      await server.methods.room.destroyRoom(id, true)
      if (room.paasLiveId) server.methods.paas.deleteIls(room.paasLiveId).catch(() => null)
      if (room.paasInavId) server.methods.paas.deleteLss(room.paasInavId).catch(() => null)

      // if (room.paasImId) await server.methods.room.deleteChannel(room.paasImId).catch(() => null)
      server.log(['info', 'task', 'roomClean'], `destroy room ${id} success`)
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (e) {
      server.log(['error', 'task'], `destroy room ${id} fail: ${e.message}`)
    }
  }
}

// ⚠️⚠️⚠️用于demo的房间清理，正式环境不需要⚠️⚠️⚠️
module.exports = function (server, options) {
  return async function (done, params) {
    try {
      await roomClean(server, params)
      if (params && params.done) done()
    } catch (e) {
      server.log(['error', 'task'], e)
    }
  }
}
