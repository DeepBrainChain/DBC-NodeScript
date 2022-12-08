import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { mongoUrlSeed } from '../publicResource.js'
import { decryptByAes256 } from '../testScript/crypto.js'
const mongoUrl = decryptByAes256(mongoUrlSeed)
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
const urlEcode = bodyParser.json()
// 定义路由
export const Select = express.Router()

// 用户审核机器获取收益
Select.get('/searchMachine', async (request, response ,next) => {
  let conn = null;
  try {
    let wallet = request.query.wallet
    let pageSize = request.query.pageSize?parseInt(request.query.pageSize):1
    let pageNum = request.query.pageNum?parseInt(request.query.pageNum):20
    let perams= [(pageSize-1)*pageNum, pageNum]
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(wallet){
      const test = conn.db("identifier").collection("auditRewardTest")
      let reward = await test.aggregate([{ $group : {_id : '$wallet', todayReward : { $sum : "$todayReward" },totalReward : { $sum : "$totalReward" }}}]).toArray()
      let result = reward.length&&reward.filter(el => el._id == wallet)
      let total = await test.find({_id: {$regex:wallet}}).count()
      var arr = await test.find({_id: {$regex:wallet}}).skip(perams[0]).limit((perams[1])).toArray()
      let total_reward = result[0]?result[0].totalReward:0
      let today_reward = result[0]?result[0].todayReward:0
      response.json({
        success: true,
        code: 200,
        totalReward: total_reward,
        todayReward: today_reward,
        total: total,
        count: arr
      })
    }else{
      response.json({
        code: 10001,
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

// 获取已有的gpu型号列表
Select.get('/getgpuType', async (request, response ,next) => {
  let conn = null;
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    let test = null
    test = conn.db("identifier").collection("MachineDetailsInfo")
    let roomArr = await test.aggregate([{$group:{_id:"$gpuType"}}]).toArray()
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
// 通过GPU型号获取机器列表
Select.post('/getlistByGpu', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { gpu_type, status, gpu_num } = request.body
    let pageSize = request.body.pageSize?parseInt(request.body.pageSize):20
    let pageNum = request.body.pageNum?parseInt(request.body.pageNum):0
    let perams= [pageSize*pageNum, pageSize]
    if (gpu_type) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      let test = conn.db("identifier").collection("MachineDetailsInfo")
      let arr = []
      let allArr = []
      let totalArray = 0
      let totalOnlineArray = 0
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
      totalArray = await test.find({"gpuType": gpu_type}).toArray()
      totalOnlineArray = await test.find({"gpuType": gpu_type, machine_status: "online"}).toArray()
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
Select.get('/getCity', async (request, response ,next) => {
  let conn = null;
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
Select.post('/getlistByCity', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { country, city, status, gpu_num } = request.body
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
        allArr = await test.find({"country": country, "city": city, "gpu_num": gpu_num, "machine_status": status}).toArray()
      } else if (status && status != '') {
        arr= await test.find({"country": country, "city": city, "machine_status": status}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"country": country, "city": city, "machine_status": status}).toArray()
      } else if (gpu_num && gpu_num != '') {
        arr= await test.find({"country": country, "city": city, "gpu_num": gpu_num}).skip(perams[0]).limit((perams[1])).toArray()
        allArr = await test.find({"country": country, "city": city, "gpu_num": gpu_num}).toArray()
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
Select.get('/getRoomnum', async (request, response ,next) => {
  let conn = null;
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
Select.post('/getlistByRoom', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { roomnum, status, gpu_num } = request.body
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

// 获取已有ip的机器列表
Select.get('/getMacIp', async (request, response ,next) => {
  let conn = null;
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const getIp = conn.db("identifier").collection("DataCenterIp")
    let iPArr = await getIp.find({}).project({hasip: 0}).toArray()
    let newList = []
    if (iPArr.length) {
      newList = iPArr.map(el => el._id)
    }
    response.json({
      success: true,
      code: 10001,
      msg: '查询成功',
      content: newList
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