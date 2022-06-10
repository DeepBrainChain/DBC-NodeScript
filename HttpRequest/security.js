import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { mongoUrlSeed } from '../publicResource.js'
import { decryptByAes256 } from '../testscript/crypto.js'
const mongoUrl = decryptByAes256(mongoUrlSeed)
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
const urlEcode = bodyParser.json()

// 定义路由
export const Security = express.Router()

// 生成安全组id
const createSecurityId = () => {
  let str = "",
  arr = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9',];
  for (let i = 0; i < 16; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}

// 生成安全组规则id
const createRuleId = () => {
  let str = "",
  arr = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9',];
  for (let i = 0; i < 8; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}

// 生成安全组名称四位随机数
const createName = () => {
  let str = "",
  arr = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4', '5', '6', '7', '8', '9',];
  for (let i = 0; i < 4; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}

// 查询安全组
Security.post('/getSecurity', urlEcode, async (request, response ,next) => {
  let conn = null
  const { wallet, SGId } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (wallet) {
      const security = conn.db("identifier").collection("securityGroup")
      const rule = conn.db("identifier").collection("securityRule")
      if (SGId) {
        let sgarr = await security.find({_id: SGId}).toArray()
        if (sgarr.length) {
          let ruleArr = await rule.find({belong: SGId}).sort({"createTime": -1}).toArray()
          sgarr[0].rule = ruleArr
        }
        response.json({
          code: 10001,
          msg: '查询成功',
          success: true,
          content: sgarr.length ? sgarr[0] : {}
        })
      } else {
        let sgarr = await security.find({wallet: wallet}).toArray()
        for (let i = 0; i< sgarr.length; i++) {
          let ruleArr = await rule.find({belong: sgarr[i]._id}).sort({"createTime": -1}).toArray()
          sgarr[i].rule = ruleArr
        }
        response.json({
          code: 10001,
          msg: '查询成功',
          success: true,
          content: sgarr
        })
      }
    } else {
      response.json({
        code: -2,
        msg: '参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})

// 创建安全组
Security.post('/createSecurity', urlEcode, async (request, response ,next) => {
  let conn = null
  // const wallet = request.body.wallet
  const { SGId, wallet, direction, protocol, port, object, action, strategy } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (wallet) {
      const security = conn.db("identifier").collection("securityGroup")
      const rule = conn.db("identifier").collection("securityRule")
      const virtualTask = conn.db("identifier").collection("virtualTask") // 虚拟机列表
      if (SGId) {
        const SGArr = await security.find({_id: SGId}).toArray()
        if (SGArr[0].bindVM != 0) {
          await security.updateOne({_id: SGId}, {$set: {setting: true}})
          await virtualTask.updateMany({network_Id: SGId}, {$set: {SgIsChange: true}})
        }
        const ruleId = createRuleId()
        await rule.insertOne({
          _id: ruleId,
          belong: SGId,
          direction: direction,
          protocol: protocol,
          port: port,
          object: object,
          action: SGArr[0].bindVM == 0 ? 'allow' : 'setting',
          strategy: strategy,
          createTime: Date.now()
        })
        response.json({
          code: 10001,
          msg: '创建成功',
          success: true
        })
      } else {
        const securityId = createSecurityId()
        const ruleId = createRuleId()
        const ruleId1 = createRuleId()
        const ruleId2 = createRuleId()
        const nonce = createName()
        await security.insertOne({
          _id: securityId,
          wallet: wallet,
          SGname: `SG${nonce}`,
          createTime: Date.now(),
          bindVM: 0,
          setting: false
        })
        await rule.insertMany([
          {
            _id: ruleId1,
            belong: securityId,
            direction: 'in',
            protocol: 'all',
            port: 'all',
            object: '0.0.0.0/0',
            action: 'allow',
            strategy: 'drop',
            createTime: Date.now(),
          },
          {
            _id: ruleId2,
            belong: securityId,
            direction: 'out',
            protocol: 'all',
            port: 'all',
            object: '0.0.0.0/0',
            action: 'allow',
            strategy: 'accept',
            createTime: Date.now() + 1000,
          },
          {
            _id: ruleId,
            belong: securityId,
            direction: direction,
            protocol: protocol,
            port: port,
            object: object,
            action: 'allow',
            strategy: strategy,
            createTime: Date.now() + 2000,
          }
        ])
        // await rule.insertMany({
        //   _id: ruleId,
        //   belong: securityId,
        //   direction: direction,
        //   protocol: protocol,
        //   port: port,
        //   object: object,
        //   action: 'allow',
        //   strategy: strategy
        // })
        response.json({
          code: 10001,
          msg: '创建成功',
          success: true
        })
      }
    } else {
      response.json({
        code: -2,
        msg: '参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})

// 编辑安全组名称
Security.post('/changeName', urlEcode, async (request, response ,next) => {
  let conn = null
  // const wallet = request.body.wallet
  const { SGId, wallet, oldname, name } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (SGId) {
      const security = conn.db("identifier").collection("securityGroup")
      let arr = await security.find({SGname: name, wallet: wallet}).toArray()
      const virOrder = conn.db("identifier").collection("virtualTask")
      // let arr1 = await virOrder.find({ belong: {$regex: wallet}, network_sec: oldname }).toArray()
      if (!arr.length) {
        await virOrder.updateMany({ belong: {$regex: wallet}, network_sec: oldname }, {$set: { network_sec: name }})
        await security.updateOne({_id: SGId}, {$set:{ SGname: name }})
        response.json({
          code: 10001,
          msg: '修改成功',
          success: true
        })
      } else {
        response.json({
          code: -3,
          msg: '已存在安全组名称',
          success: false
        })
      }
    } else {
      response.json({
        code: -2,
        msg: '参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})

// 删除安全组
Security.post('/deleteSG', urlEcode, async (request, response ,next) => {
  let conn = null
  // const wallet = request.body.wallet
  const { SGId } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (SGId) {
      const security = conn.db("identifier").collection("securityGroup")
      let arr = await security.find({_id: SGId}).toArray()
      if (arr.length) {
        if (arr[0].bindVM != 0) {
          response.json({
            code: -4,
            msg: '安全组存在绑定虚拟机，不能删除',
            success: false
          })
        } else {
          await security.deleteOne({_id: SGId})
          response.json({
            code: 10001,
            msg: '删除成功',
            success: true
          })
        }
      } else {
        response.json({
          code: -3,
          msg: '安全组不存在',
          success: false
        })
      }
    } else {
      response.json({
        code: -2,
        msg: '参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})

// 克隆安全组
Security.post('/cloneSG', urlEcode, async (request, response ,next) => {
  let conn = null
  const { SGId, wallet } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (SGId&&wallet) {
      const security = conn.db("identifier").collection("securityGroup")
      const rule = conn.db("identifier").collection("securityRule")
      const arr = await security.find({}).toArray()
      let oldArr = await security.find({_id: SGId}).toArray()
      let oldRuleArr = await rule.find({belong: SGId}).project({_id: 0, belong: 0}).toArray()
      if (oldArr.length) {
        const securityId = createSecurityId()
        const nonce = createName()
        await security.insertOne({
          _id: securityId,
          wallet: wallet,
          SGname: `SG${nonce}`,
          createTime: Date.now(),
          bindVM: 0
        })
        for (let i = 0; i< oldRuleArr.length; i++) {
          const ruleId = createRuleId()
          await rule.insertOne({
            _id: ruleId,
            belong: securityId,
            ...oldRuleArr[i]
          })
        }
        response.json({
          code: 10001,
          msg: '克隆成功',
          success: true
        })
      } else {
        response.json({
          code: -3,
          msg: '安全组不存在，无法克隆',
          success: true
        })
      }
    } else {
      response.json({
        code: -2,
        msg: '参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})


// 删除安全组规则
Security.post('/deleteSGRule', urlEcode, async (request, response ,next) => {
  let conn = null
  // const wallet = request.body.wallet
  const { SGId, ruleId } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const security = conn.db("identifier").collection("securityGroup")
    const SGArr = await security.find({_id: SGId}).toArray()
    if (ruleId) {
      const rule = conn.db("identifier").collection("securityRule")
      const virtualTask = conn.db("identifier").collection("virtualTask") // 虚拟机列表
      if (SGArr[0].bindVM != 0) {
        await security.updateOne({_id: SGId}, {$set: {setting: true}})
        await virtualTask.updateMany({network_Id: SGId}, {$set: {SgIsChange: true}})
      }
      await rule.deleteOne({_id: ruleId})
      response.json({
        code: 10001,
        msg: '删除成功',
        success: true
      })
    } else {
      response.json({
        code: -2,
        msg: '参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})

// 修改安全组规则
Security.post('/editSGRule', urlEcode, async (request, response ,next) => {
  let conn = null
  const { SGId, ruleId, direction, protocol, port, object, strategy } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (ruleId&&direction&&protocol&&port&&object) {
      const rule = conn.db("identifier").collection("securityRule")
      const security = conn.db("identifier").collection("securityGroup")
      const virtualTask = conn.db("identifier").collection("virtualTask") // 虚拟机列表
      const SGArr = await security.find({_id: SGId}).toArray()
      if (SGArr[0].bindVM != 0) {
        await security.updateOne({_id: SGId}, {$set: {setting: true}})
        await virtualTask.updateMany({network_Id: SGId}, {$set: {SgIsChange: true}})
      }
      await rule.updateOne({_id: ruleId}, {
        $set: {
          direction: direction,
          protocol: protocol,
          port: port,
          object: object,
          action: SGArr[0].bindVM == 0 ? 'allow' : 'setting',
          strategy: strategy
        }
      })
      response.json({
        code: 10001,
        msg: '修改成功',
        success: true
      })
    } else {
      response.json({
        code: -2,
        msg: '参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})