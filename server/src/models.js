'use strict'
const { safeParse } = require('@hapi/bourne')
const { Model, DataTypes } = require('sequelize')

const BIGINT = DataTypes.BIGINT({ unsigned: true })
// 使用string模拟json存储
const TYPEJSON = DataTypes.JSON()
TYPEJSON.key = 'VARCHAR(2047)'
TYPEJSON._sanitize = function (value){ return (typeof value !== 'string') ? null : safeParse(value) }
TYPEJSON._stringify = function (value){
  try {
    return JSON.stringify(value)
  } catch (e) { /**/
  }
  return null
}

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
    type: BIGINT,
    primaryKey: true,
    allowNull: false,
    autoIncrement: true
  },
  sid: DataTypes.UUID(), // 创建者的sid
  appId: DataTypes.CHAR(16), // appId
  type: DataTypes.TINYINT, // 1音视频直播 2纯音频直播
  maxMember: DataTypes.TINYINT, // 最大人数限制
  paasLiveId: DataTypes.CHAR(14), // 直播room id （paas）
  paasInavId: DataTypes.CHAR(14), // 互动room id （paas）
  paasImId: DataTypes.CHAR(14), // 聊天room id （paas）
  title: DataTypes.STRING(255), // 互动直播间名称
  ext: TYPEJSON,
  lastUse: DataTypes.DATE
}
Rooms.option = {
  tableName: 'rooms',
  deletedAt: true,
  paranoid: true,
  indexes: [
    {
      using: 'HASH',
      fields: ['sid']
    },
    {
      using: 'HASH',
      fields: ['title']
    },
    {
      using: 'HASH',
      fields: ['paas_live_id']
    },
    {
      using: 'HASH',
      fields: ['paas_im_id']
    },
    {
      using: 'BTREE',
      fields: ['last_use']
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
  roomId: {
    type: BIGINT,
    allowNull: false
  },
  docId: {
    type: DataTypes.CHAR(16),
    allowNull: false
  },
  appId: {
    type: DataTypes.CHAR(16),
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

class Forms extends Model {
}

Forms.attributes = {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: BIGINT,
    allowNull: false
  },
  formId: {
    type: DataTypes.CHAR(16),
    allowNull: false
  },
  appId: {
    type: DataTypes.CHAR(16),
    allowNull: false
  },
  // 1未发布、2已发布
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 1
  },
  publishAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
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
    type: BIGINT,
    allowNull: false
  },
  appId: {
    type: DataTypes.CHAR(16),
    allowNull: false
  },
  type: {
    type: DataTypes.TINYINT,
    allowNull: false
  },
  paasLiveId: DataTypes.CHAR(16),
  paasImId: DataTypes.CHAR(16),
  title: DataTypes.STRING(255),
  ext: TYPEJSON
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

exports.Sessions = Sessions
exports.Rooms = Rooms
exports.Docs = Docs
exports.Vods = Vods
exports.Forms = Forms

exports.init = (sequelize, supportBigNumbers) => {
  const models = [Sessions, Rooms, Docs, Vods, Forms]
  for (const model of models) {
    if (!supportBigNumbers) {
      for (const key of Object.keys(model.attributes)) {
        const attribute = model.attributes[key]
        if (!(attribute && attribute.type)) continue
        if (attribute.type.key === 'BIGINT') attribute.type = DataTypes.STRING(20)
      }
    }
    model.init(model.attributes, { ...model.option, sequelize })
  }
}
