'use strict'

function schedule (server, options) {
  // 每天清理7天以上不再使用的互动房间，避免太多无用数据
  // ⚠️⚠️⚠️用于demo的房间清理，您不需要这个，推荐您保留房间分配给个人，而非使用时创建⚠️⚠️⚠️
  // server.methods.task.addTask('room-clean-over-7', 'room-clean', '0 15 6 * * *', { day: 7, range: 3 })
}

module.exports = function (server, options) {
  schedule(server, options)
}
