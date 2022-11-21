import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { typeJson, wssChain, mongoUrlSeed, baseUrl } from '../publicResource.js'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import httpRequest from 'request-promise';
import { decryptByAes256 } from '../testScript/crypto.js'
const mongoUrl = decryptByAes256(mongoUrlSeed)
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
const urlEcode = bodyParser.json()
// 定义路由
export const Monitor = express.Router()
// 链上交互
let api = null
let congtuapi = null
const keyring = new Keyring({type: 'sr25519'})
export const GetApi = async () =>{
  if (!api) {
    const provider = new WsProvider(wssChain.dbc)
    api = await ApiPromise.create({ 
      provider ,
      types: typeJson
    })
  }
  return { api }
}
// 定义路由
export const Signle = express.Router()

// 获取已有的gpu型号列表
Signle.get('/getgpuType', async (request, response ,next) => {
  let conn = null;
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const test = conn.db("identifier").collection("MachineDetailsInfo")
    let roomArr = await test.aggregate([{$group:{_id:"$gpuType"}}]).toArray()
    let arr = []
    for (let i=0; i < roomArr.length; i++) {
      arr.push(roomArr[i]._id)
    }
    response.json({
      success: true,
      code: 10001,
      msg: '查询成功',
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
// 通过GPU型号获取机器列表 
Signle.post('/getlistByGpu', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { gpu_type, status, gpu_num, signle } = request.body
    let pageSize = request.body.pageSize?parseInt(request.body.pageSize):20
    let pageNum = request.body.pageNum?parseInt(request.body.pageNum):0
    let perams= [pageSize*pageNum, pageSize]
    if (gpu_type) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const test = conn.db("identifier").collection("MachineDetailsInfo")
      let arr = []
      let allArr = []
      if (status && gpu_num && status != '' && gpu_num != '') {
        arr= await test.find({"gpuType": gpu_type, "gpu_num": gpu_num, "machine_status": status}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"gpuType": gpu_type, "gpu_num": gpu_num, "machine_status": status}).toArray()
      } else if (status && status != '') {
        arr= await test.find({"gpuType": gpu_type, "machine_status": status}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"gpuType": gpu_type, "machine_status": status}).toArray()
      } else if (gpu_num && gpu_num != '') {
        arr= await test.find({"gpuType": gpu_type, "gpu_num": gpu_num}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"gpuType": gpu_type, "gpu_num": gpu_num}).toArray()
      } else {
        arr= await test.find({"gpuType": gpu_type}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"gpuType": gpu_type}).toArray()
      }
      let totalArray = await test.find({"gpuType": gpu_type}).toArray()
      let totalOnlineArray = await test.find({"gpuType": gpu_type, machine_status: "online"}).toArray()
      const total = totalArray.length
      const onlinetotal = totalOnlineArray.length
      const typeTotal = allArr.length
      let data = {
        list: arr,
        typeTotal: typeTotal,
        total: total,
        online: onlinetotal
      }
      response.json({
        success: true,
        code: 10001,
        msg: '查询成功',
        content: data
      })
    } else {
      response.json({
        code: -1,
        msg:'Gpu型号不能为空',
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

// 获取已有的city列表
Signle.get('/getCity', async (request, response ,next) => {
  let conn = null;
  let signle = request.query.signle
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const test = conn.db("identifier").collection("MachineDetailsInfo")
    let cityArr = await test.aggregate([{$group:{_id:"$country", city:{ $addToSet:'$city'}}}]).toArray()
    if (cityArr.length) {
      let All = []
      for (let i = 0; i < cityArr.length; i++) {
        let country = cityArr[i]._id
        for (let j = 0; j < cityArr[i].city.length; j++) {
          let city = cityArr[i].city[j]
          All.push({
            country: country,
            city: city,
            desc: `${country} ${city}`
          })
        }
      }
      response.json({
        success: true,
        code: 10001,
        msg: '查询成功',
        content: All
      })
    } else {
      response.json({
        success: true,
        code: 10001,
        msg: '查询成功',
        content: []
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

// 通过地区获取机器列表
Signle.post('/getlistByCity', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { country, city, status, gpu_num, signle } = request.body
    let pageSize = request.body.pageSize?parseInt(request.body.pageSize):20
    let pageNum = request.body.pageNum?parseInt(request.body.pageNum):0
    let perams= [pageSize*pageNum, pageSize]
    if (country&&city) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const test = conn.db("identifier").collection("MachineDetailsInfo")
      let arr = []
      let allArr = []
      if (status && gpu_num && status != '' && gpu_num != '') {
        arr= await test.find({"country": country, "city": city, "gpu_num": gpu_num, "machine_status": status}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"country": country, "city": city,  "gpu_num": gpu_num, "machine_status": status}).toArray()
      } else if (status && status != '') {
        arr= await test.find({"country": country, "city": city, "machine_status": status}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"country": country, "city": city, "machine_status": status}).toArray()
      } else if (gpu_num && gpu_num != '') {
        arr= await test.find({"country": country, "city": city, "gpu_num": gpu_num}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"country": country, "city": city,  "gpu_num": gpu_num}).toArray()
      } else {
        arr= await test.find({"country": country, "city": city}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"country": country, "city": city}).toArray()
      }
      let totalArray = await test.find({"country": country, "city": city}).toArray()
      let totalOnlineArray = await test.find({"country": country, "city": city, machine_status: "online"}).toArray()
      const total = totalArray.length
      const onlinetotal = totalOnlineArray.length
      const typeTotal = allArr.length
      let data = {
        list: arr,
        total: total,
        online: onlinetotal,
        typeTotal: typeTotal
      }
      response.json({
        success: true,
        code: 10001,
        msg: '查询成功',
        content: data
      })
    } else {
      response.json({
        code: -1,
        msg:'国家城市不能为空',
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

// 获取已有的机房编号列表
Signle.get('/getRoomnum', async (request, response ,next) => {
  let conn = null;
  let signle = request.query.signle
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const test = conn.db("identifier").collection("MachineDetailsInfo")
    let roomArr = await test.aggregate([{$group:{_id:"$server_room"}}]).toArray()
    let arr = []
    for (let i=0; i<roomArr.length; i++) {
      arr.push(roomArr[i]._id)
    }
    response.json({
      success: true,
      code: 10001,
      msg: '查询成功',
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

// 通过机房编号获取机器列表
Signle.post('/getlistByRoom', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { roomnum, status, gpu_num, signle } = request.body
    let pageSize = request.body.pageSize?parseInt(request.body.pageSize):20
    let pageNum = request.body.pageNum?parseInt(request.body.pageNum):0
    let perams= [pageSize*pageNum, pageSize]
    if (roomnum) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const test = conn.db("identifier").collection("MachineDetailsInfo")
      let arr = []
      let allArr = []
      if (status && gpu_num && status != '' && gpu_num != '') {
        arr = await test.find({"server_room": roomnum, "gpu_num": gpu_num, "machine_status": status}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"server_room": roomnum, "gpu_num": gpu_num, "machine_status": status}).toArray()
      } else if (status && status != '') {
        arr = await test.find({"server_room": roomnum, "machine_status": status}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"server_room": roomnum, "machine_status": status}).toArray()
      } else if (gpu_num && gpu_num != '') {
        arr = await test.find({"server_room": roomnum, "gpu_num": gpu_num}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"server_room": roomnum, "gpu_num": gpu_num}).toArray()
      } else {
        arr = await test.find({"server_room": roomnum}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"server_room": roomnum}).toArray()
      }
      let totalArray = await test.find({"server_room": roomnum}).toArray()
      let totalOnlineArray = await test.find({"server_room": roomnum, machine_status: "online"}).toArray()
      const total = totalArray.length
      const onlinetotal = totalOnlineArray.length
      const typeTotal = allArr.length
      let data = {
        list: arr,
        total: total,
        online: onlinetotal,
        typeTotal: typeTotal
      }
      response.json({
        success: true,
        code: 10001,
        msg: '查询成功',
        content: data
      })
    } else {
      response.json({
        code: -1,
        msg:'机房编号不能为空',
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

// 创建时查询机器的相关信息
Signle.post('/getMachineInfo', urlEcode, async (request, response ,next) => {
  try {
    const { machine_id } = request.body
    if(machine_id) {
      let VirInfo = {}
      try {
        VirInfo = await httpRequest({
          url: baseUrl + "/api/v1/mining_nodes",
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {
              
            }
          }
        })
      } catch (err) {
        VirInfo = {
          message: err.message
        }
      }
      if (VirInfo.errcode != undefined || VirInfo.errcode != null) {
        VirInfo = VirInfo
      } else {
        if (VirInfo.netcongtu || VirInfo.mainnet) {
          if (machine_id.indexOf('CTC') != -1) {
            VirInfo = VirInfo.netcongtu
          } else {
            VirInfo = VirInfo.mainnet
          }
        } else {
          VirInfo = VirInfo
        }
      }
      if (VirInfo&&VirInfo.errcode == 0) {
        response.json({
          code: 10001,
          msg: '获取成功',
          success: true,
          content: VirInfo.message
        })
      } else {
        response.json({
          code: -2,
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
    
  }
})
