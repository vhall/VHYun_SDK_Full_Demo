'use strict'
const _ = require('lodash')
const {Rooms} = require('../models')

const oneday = 1000 * 3600 * 24

let cacheRoom
let cacheUser
const room = {
  async getRoom (roomId) {
    if (!roomId) return null
    let room = await cacheRoom.get('' + roomId)
    if (room) return room
    const $room = await Rooms.findByPk(roomId, { })
    if (!$room) return
    room = $room.toJSON()
    cacheRoom.set('' + roomId, room)
    return room
  },
  async getRoomIdByTitle (title) {
    const $room = await Rooms.findOne({ where: { title }, attributes: ['id'] })
    if (!$room) return
    return $room.id
  },
  async getRoomByTitle (title) {
    const roomId = await this.getRoomIdByTitle(title)
    if (!roomId) return null
    return this.getRoom(roomId)
  },
  async setRoomValue (roomId, key, value) {
    let room = await cacheRoom.get('' + roomId)
    if (!room) return
    room[key] = value
    cacheRoom.set('' + roomId, room)
  },
  async getRoomValue (roomId, key) {
    let room = await cacheRoom.get('' + roomId)
    if (!room) return
    return room[key]
  },
  // 保存房间用户
  async setRoomUser (roomId, user) {
    const userId = user.userId
    cacheUser.set(`${roomId}.${userId}`, user, )
  },
  async getRoomUser (roomId, userId) {
    if (!userId) return null
    const user = await cacheUser.get(`${roomId}.${userId}`)
    return user
  },
  async setRoomUserIdOfNameAndIdentity (roomId, userId, identity, username) {
    cacheUser.set(`${roomId}.un.${identity}.${username}`, userId)
  },
  async getRoomUserIdByNameAndIdentity (roomId, identity, username) {
    if (!(roomId && username && identity)) return null
    const userId = await cacheUser.get(`${roomId}.un.${identity}.${username}`)
    return userId
  },
  async clearRoom (roomId) {
    await cacheRoom.drop('' + roomId)
  },
  async destroyRoom (roomId) {
    const room = this.getRoom(roomId)
    if (!room) return
    await Rooms.destroy({ where: { id: roomId } })
    await cacheRoom.drop('' + roomId)
  }
}

exports.plugin = {
  pkg: {name: 'room-method'},
  register: async function (server, options) {
    cacheRoom = server.cache({ segment: 'room', expiresIn: oneday })
    cacheUser = server.cache({ segment: 'user', expiresIn: oneday * 10 })

    for (const method of _.keys(room)) {
      if (typeof room[method] !== 'function') continue
      server.method('room.' + method, room[method], {})
    }
  },
}
