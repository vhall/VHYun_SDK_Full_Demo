'use strict'
const { Model, DataTypes } = require('sequelize')

class Sessions extends Model {
}

Sessions.attributes = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  sid: DataTypes.UUID(),
  roomCounter: DataTypes.INTEGER,
  paasToken: DataTypes.STRING(32),
  ipAddress: DataTypes.STRING(40),
  from: DataTypes.TINYINT,
  origin: DataTypes.STRING(255),
  username: DataTypes.STRING(255),
  userAgent: DataTypes.STRING(255),
  userContact: DataTypes.STRING(255)
}
Sessions.option = {
  tableName: 'sessions',
  indexes: [
    {
      using: 'HASH',
      unique: true,
      fields: ['sid']
    }
  ]
}

class Rooms extends Model {
}

Rooms.attributes = {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  sid: DataTypes.UUID(), // 创建者的sid
  appId: DataTypes.CHAR(16), // appId
  maxMember: DataTypes.TINYINT, // 最大人数限制
  paasLiveId: DataTypes.CHAR(14), // 直播room id （paas）
  paasInavId: DataTypes.CHAR(14), // 互动room id （paas）
  paasImId: DataTypes.CHAR(14), // 聊天room id （paas）
  title: DataTypes.STRING(255), // 互动直播间名称
  lastUse: DataTypes.DATE
}
Rooms.option = {
  tableName: 'rooms',
  indexes: [
    {
      using: 'HASH',
      fields: ['sid']
    },
    {
      using: 'HASH',
      fields: ['title']
    }
  ]
}

class Docs extends Model {
}

Docs.attributes = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  docId: {
    type: DataTypes.CHAR(16),
    allowNull: false
  },
  roomId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  },
  process: {
    type: DataTypes.TINYINT,
    defaultValue: 0
  },
  pageNum: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  width: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  height: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  ext: {
    type: DataTypes.STRING(16),
    defaultValue: ''
  },
  conversionType: {
    type: DataTypes.STRING(16),
    defaultValue: ''
  },
  title: {
    type: DataTypes.STRING(255),
    defaultValue: ''
  }
}
Docs.option = {
  tableName: 'docs',
  indexes: [
    {
      using: 'HASH',
      fields: ['room_id']
    }
  ]
}

class Vods extends Model {
}

Vods.attributes = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  vodId: {
    type: DataTypes.CHAR(16),
    allowNull: false
  },
  roomId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  }
}
Vods.option = {
  tableName: 'vods',
  indexes: [
    {
      using: 'HASH',
      fields: ['room_id']
    }
  ]
}

class Forms extends Model {
}

Forms.attributes = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  formId: {
    type: DataTypes.CHAR(16),
    allowNull: false
  },
  roomId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false
  }
}
Forms.option = {
  tableName: 'forms',
  indexes: [
    {
      using: 'HASH',
      fields: ['room_id']
    }
  ]
}


exports.Sessions = Sessions
exports.Rooms = Rooms
exports.Docs = Docs
exports.Vods = Vods
exports.Forms = Forms

exports.init = sequelize => {
  const models = [Sessions, Rooms, Docs] // , Vods, Forms]
  for (const model of models) {
    model.init(model.attributes, { ...model.option, sequelize })
  }
}
