import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import httpRequest from 'request-promise';
import { mongoUrl, baseUrl } from '../publicResource.js'
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;

// 验证签名
const Verify = async (msg, sign, wallet) => {
  await cryptoWaitReady();
  let result = await signatureVerify( msg, sign, wallet )
  return result.isValid 
}

const urlEcode = bodyParser.json()
// 定义路由
export const getAuditList = express.Router()

// 获取用户审核列表
getAuditList.get('/getAuditList', async (request, response ,next) => {
  let conn = null;
  try {
    let wallet = request.query.wallet
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(wallet){
      const test = conn.db("identifier").collection("auditListTest")
      let total = await test.find({wallet: wallet}).count()
      var arr = await test.find({wallet: wallet, status: {$in:["booked", "hashed"]}}).skip(0).limit(total).toArray()
      response.json({
        success: true,
        code: 10001,
        total: total,
        content: arr
      })
    }else{
      response.json({
        code: -1,
        msg:'钱包地址不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
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


// 修改状态
getAuditList.post('/changeStatus', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    let id = request.body.machine_id
    let wallet = request.body.wallet
    let status = request.body.status
    let size = request.body.size
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (id&&status&&wallet) {
      const test = conn.db("identifier").collection("auditListTest")
      if (status == 'booked') {
        await test.updateOne(
          { _id: wallet+id },
          { $set: { status: 'hashed' }}
        )
        await test.updateMany(
          { machine_id: id },
          { $set: { HashSize: size+1 }}
        )
      } else if (status == 'hashed') {
        await test.updateOne(
          { _id: wallet+id },
          { $set: { status: 'confirm' }}
        )
      }
      response.json({
        code: 10001,
        msg: '提交成功，数据更新成功',
        success: true
      })
    } else {
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
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

// 保存用户提交Hash
getAuditList.post('/saveAuditHash', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    let { wallet, signature, signaturemsg } = request.body
    if (wallet&&signature&&signaturemsg) {
      let hasNonce = await Verify(signaturemsg, signature, wallet)
      if (hasNonce) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        const searchNonce = conn.db("identifier").collection("nonceList")
        let NonceInfo = await searchNonce.find({wallet: wallet, nonce: signaturemsg, belong: 'auditvirtual'}).toArray()
        if (!NonceInfo.length) {
          await searchNonce.insertOne({ nonce: signaturemsg, wallet: wallet, belong: 'auditvirtual' })
          const ResultHash = conn.db("identifier").collection("ResultHashInfo")
          let seeHash = await ResultHash.find({_id: wallet + request.body.machine_id }).toArray()
          if (seeHash.length) {
            await ResultHash.updateOne({ _id: wallet + request.body.machine_id }, { $set: request.body})
          } else {
            let insertData = {
              _id: wallet + request.body.machine_id,
              ...request.body
            }
            await ResultHash.insertOne(insertData)
          }
          response.json({
            code: 10001,
            msg: '保存成功',
            success: true
          })
        } else {
          response.json({
            code: -3,
            msg:'重复签名，验证无效',
            success: false
          })
        }
      } else {
        response.json({
          code: -2,
          msg:'签名验证失败',
          success: false
        })
      }
    } else {
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
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

// 获取用户提交Hash
getAuditList.post('/getAuditHash', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    let { machine_id, wallet, signature, signaturemsg } = request.body
    if (wallet&&signature&&signaturemsg) {
      let hasNonce = await Verify(signaturemsg, signature, wallet)
      if (hasNonce) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        const searchNonce = conn.db("identifier").collection("nonceList")
        let NonceInfo = await searchNonce.find({wallet: wallet, nonce: signaturemsg, belong: 'auditvirtual'}).toArray()
        if (!NonceInfo.length) {
          await searchNonce.insertOne({ nonce: signaturemsg, wallet: wallet, belong: 'auditvirtual' })
          const ResultHash = conn.db("identifier").collection("ResultHashInfo")
          let seeHash = await ResultHash.find({_id: wallet + machine_id }).toArray()
          if (seeHash.length) {
            response.json({
              code: 10001,
              msg: '查询成功',
              success: true,
              content: seeHash[0]
            })
          } else {
            response.json({
              code: -4,
              msg:'未查询到提交的原始信息',
              success: false
            })
          }
        } else {
          response.json({
            code: -3,
            msg:'重复签名，验证无效',
            success: false
          })
        }
      } else {
        response.json({
          code: -2,
          msg:'签名验证失败',
          success: false
        })
      }
    } else {
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
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

// 获取用户验证GPU列表
getAuditList.get('/getVerifyGPUList', async (request, response ,next) => {
  let conn = null;
  try {
    let wallet = request.query.wallet
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(wallet){
      const test = conn.db("identifier").collection("auditListTest")
      let total = await test.find({wallet: wallet}).count()
      var arr = await test.find({wallet: wallet}).toArray()
      response.json({
        success: true,
        code: 10001,
        total: total,
        content: arr
      })
    }else{
      response.json({
        code: -1,
        msg:'钱包地址不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
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

// 创建虚拟机
getAuditList.post('/createVerifyVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { machine_id, image_name, gpu_count, cpu_cores, mem_size, disk_size, nonce, sign, wallet } = request.body
    if(machine_id&&nonce&&sign&&wallet) {
      let VirInfo = {}
      try {
        VirInfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/start",
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {
              "ssh_port": '5682',
              "image_name": String(image_name),
              "gpu_count": String(gpu_count),
              "cpu_cores": String(cpu_cores),
              "mem_size": String(mem_size),
              "disk_size": String(disk_size),
              "vnc_port": '5904',
              "vm_xml": "",
              "vm_xml_url": ""
            },
            "nonce": nonce,
            "sign": sign,
            "wallet": wallet
          }
        })
      } catch (err) {
        VirInfo = {
          message: err.message
        }
      }
      if (VirInfo&&VirInfo.errcode == 0) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        const task = conn.db("identifier").collection("verifyVirInfo")
        let findResult = await task.find({ _id: machine_id}).toArray()
        if (findResult.length) {
          await task.updateOne({_id: machine_id},{$set: {task_id: VirInfo.message.task_id}})
        } else {
          await task.insertOne({
            _id: machine_id,
            task_id: VirInfo.message.task_id
          })
        }
        response.json({
          code: 10001,
          msg: '创建成功',
          success: true,
          content: VirInfo.message
        })
      } else {
        response.json({
          code: -4,
          msg: VirInfo.message,
          success: false
        })
      }
    }else{
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
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

// 查看虚拟机 
getAuditList.post('/getVerifyVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { nonce, sign, wallet, machine_id } = request.body
    if(machine_id&&nonce&&sign&&wallet) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const task = conn.db("identifier").collection("verifyVirInfo")
      let findResult = await task.find({ _id: machine_id}).toArray()
      if (findResult.length) {
        let taskinfo = {}
        try {
          taskinfo = await httpRequest({
            url: baseUrl + "/api/v1/tasks/"+findResult[0].task_id,
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": {},
              "nonce": nonce,
              "sign": sign,
              "wallet": wallet
            }
          })
        } catch (err) {
          taskinfo = {
            message: err.message
          }
        }
        if (taskinfo&&taskinfo.errcode == 0) {
          response.json({
            code: 10001,
            msg: '请求成功',
            success: true,
            content: taskinfo.message
          })
        } else {
          response.json({
            code: -3,
            msg: taskinfo.message,
            success: false
          })
        }
      } else {
        response.json({
          code: -2,
          msg: '该机器未创建虚拟机',
          success: false
        })
      }
    }else{
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
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

// 重启虚拟机
getAuditList.post('/restartVerifyVir', urlEcode, async (request, response ,next) => {
  try {
    const { task_id, machine_id, nonce, sign, wallet } = request.body
    if(machine_id&&task_id) {
      let taskinfo = {}
      try {
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/restart/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "nonce": nonce,
            "sign": sign,
            "wallet": wallet
          }
        })
      } catch (err) {
        taskinfo = {
          message: err.message
        }
      }
      if (taskinfo&&taskinfo.errcode == 0) {
        response.json({
          code: 10001,
          msg: '重启成功',
          success: true
        })
      }else {
        response.json({
          code: -2,
          msg: taskinfo.message,
          success: false
        })
      }
    }else{
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
      msg:error.message,
      success: false
    })
  }
})


// 获取地域系数
getAuditList.get('/getCoefficient', async (request, response ,next) => {
  let conn = null;
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const test = conn.db("identifier").collection("coefficient")
    var arr = await test.find({}).toArray()
    response.json({
      success: true,
      code: 10001,
      msg:'获取成功',
      content: arr
    })
  } catch (error) {
    response.json({
      code: -10001,
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