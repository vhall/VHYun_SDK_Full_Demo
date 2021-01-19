# 概述
这是一个基于互动教学公开课场景的demo。一名老师在课堂上进行教学，其他学生可以在直播间进行观看。在没有其他人上麦的情况下，这就是一个只有讲课老师单画面的旁路直播场景。当有其他成员上麦与讲师进行互动时，学生和讲师的音视频流在云端混合后被其他直播间的人观看，这就形成了一个互动场景的旁路直播。


# 目的及目标
1. 以标准云为目标实现demo的产品化形态
2. 实现demo下载后可以让业务层简单调整后可集成


# 运行 (试用)
## 事先准备
* 微吼云 `secretKey` 及 `appId`，请在 [这里申请](https://console.vhallyun.com) (必要) 
* Node.js >= 12 (必要)
* 准备好要部署的目录，下载代码

## 前端
1. 进入到刚刚仓库下的 client 目录
2. 使用 `npm i` 安装依赖包
3. 运行 `npm run build:prod` 编译前端代码，打包后的代码会存放在 dist 目录
4. 复制 dist 内的文件到 ../server/public ，转到运行后端即可

## 后端
1. 进入到刚刚仓库下的 server 目录
2. 编辑 config 目录下的 `default.json` 文件，修改对应 `secretKey` 及 `appId` 并保存
3. 使用 `npm i` 安装依赖包
4. 使用 `node index.js` 运行


# 部署
## 事先准备
* Node.js >= 12 (必要)
* Mysql >= 5.6 (建议)
* Redis >= 2.8.13 (建议)
* 微吼云 `secretKey` 及 `appId`
* `证书` 和 `私钥` (非必须，但本服务需要https才可正常使用)
* 准备好要部署的目录，下载代码
* 创建对应配置的数据库

## 前端
1. 进入到刚刚仓库目录下的 client 目录
2. 编辑 `.env.production` 文件，修改 `VUE_APP_API_BASE` 为后端将要使用的 URI
2. 使用 `npm i` 安装依赖包
3. 运行 `npm run build:prod` 编译前端代码，打包后的代码会在 dist 目录
4. 上传 dist 目录至 cdn

## 后端
1. 进入到刚刚仓库目录下的 server 目录
2. 添加 `production.json` 文件到 config 目录（示例见 `production.json.example` 文件），
编辑对应数据库/缓存/appId/secretKey并保存
3. 使用 `npm i` 安装依赖包
4. 使用 `NODE_ENV=production node index.js` 运行

