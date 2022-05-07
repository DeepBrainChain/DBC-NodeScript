import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { typeJson, wssChain, mongoUrl, baseUrl } from '../publicResource.js'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, randomAsU8a, signatureVerify } from '@polkadot/util-crypto';
import { BN_TEN, u8aToHex } from '@polkadot/util';
import httpRequest from 'request-promise';
import BN from 'bn.js'
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
const urlEcode = bodyParser.json()
// 定义路由
export const signleRentVir = express.Router()
// 链上交互
let api  = null
let congtuapi =null
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

// 输入的值转BN
export const inputToBn = (input, siPower, basePower) => {
  const isDecimalValue = input.match(/^(\d+)\.(\d+)$/);
  let result;
  if (isDecimalValue) {
    const div = new BN(input.replace(/\.\d*$/, ''));
    const modString = input.replace(/^\d+\./, '').substr(0, api?.registry.chainDecimals[0]);
    const mod = new BN(modString);
    result = div
      .mul(BN_TEN.pow(siPower))
      .add(mod.mul(BN_TEN.pow(new BN(basePower - modString.length))));
  } else {
    result = new BN(input.replace(/[^\d]/g, ''))
      .mul(BN_TEN.pow(siPower));
  }
  return result
}

export const standardGPUPointPrice = async () => {
  await GetApi();
  let de = await api.query.onlineProfile.standardGPUPointPrice();
  let data = de.toJSON()
  return data
}

/**
 * getBlockTime 获取链上DBC的实时价格
 * 
 * @return data:返回链上单个算力值的价格
 */
 export const dbcPriceOcw = async () => {
  await GetApi();
  let de = await api.query.dbcPriceOcw.avgPrice();
  return de.toJSON()
}

export const getnum = (num) => {
  let num1 = String(num)
  let hasPoint;
  num1.indexOf(".") >= 0? hasPoint = true: hasPoint = false
  return hasPoint ? num1.substring(0,num1.indexOf(".")+3) : num1;
}

// 获取 network_name 名称
const getnetwork = () => {
  let len = parseInt(Math.random()*5+6,10)
  let str = "",
  arr = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
    'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
    'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z','0', '1', '2', '3', '4', '5', '6', '7', '8', '9',];
  for (let i = 0; i < len; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}

// 获取四位随机数
const randomWord7 = () => {
  let str = "",
  arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = 0; i < 7; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}
const randomWord4 = () => {
  let str = "",
  arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = 0; i < 4; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}
// 创建账户
export const createAccountFromSeed = async () => {
  if (keyring) {
    await cryptoWaitReady()
    const DBC = randomWord4()
    const seed = u8aToHex(randomAsU8a())
    const pair = keyring.addFromUri(seed)
    return {
      seed: seed,
      wallet: pair.address,
      nonce: DBC
    }
  }
  return null
}


// 用户创建之前查询机器下虚拟机数量，并返回可用的ssh|vnc, rdp, 开放端口范围
// ssh\rdp: 5600~5899 port_min: 6000~59991 vnc_port: 5900~5999
signleRentVir.post('/getPort', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const virOrder = conn.db("identifier").collection("virOrderInfo")
    const findPort = await virOrder.aggregate([{$group:{_id:"$belong", use_sshOrrdp:{ $addToSet:'$use_sshOrrdp'}, use_port_min:{ $addToSet:'$use_port_min'}, use_vnc:{ $addToSet:'$use_vnc'}}}]).toArray()
    response.json({
      code: 10001,
      msg: '获取成功',
      success: true,
      content: findPort
    })
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

// 获取租用虚拟机加价百分比
signleRentVir.post('/getSignlePercentage', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const test = conn.db("identifier").collection("DBCPercentage")
    let arr = await test.find({_id: 'percentage'}).toArray()
    if (arr.length) {
      response.json({
        success: true,
        code: 10001,
        msg: '获取加价成功',
        content: arr[0]
      })
    } else {
      response.json({
        success: true,
        code: 10001,
        msg: '获取加价成功',
        content: { 
          "percentage_signle" : 0,
          "percentage_whole" : 0 
        }
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

// 生成临时钱包私钥对
signleRentVir.post('/createSignleWallet', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    let id = request.body.id
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id){
      const test = conn.db("identifier").collection("SignleTemporaryWallet")
      let arr = await test.find({_id: id}).toArray()
      if (! arr.length) {
        let info = await createAccountFromSeed()
        const data = {
          _id: id,
          seed: info.seed,
          wallet: info.wallet,
          nonce: info.nonce
        }
        await test.insertOne(data)
      }
      let getWallet = await test.find({_id: id}).toArray()
      let wallet = {
        wallet: getWallet[0].wallet,
        nonce: getWallet[0].nonce
      }
      response.json({
        success: true,
        code: 10001,
        msg: '获取临时钱包成功',
        content: wallet
      })
    }else{
      response.json({
        code: -1,
        msg:'获取参数信息失败',
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

// 生成虚拟机订单 1.创建中，未转账 2.创建成功，未转账 3.转账成功，开始使用 4.转账失败，取消订单 5.订单结束 6.创建失败，取消订单
signleRentVir.post('/createSignleVirOrder', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { 
      machine_id, 
      ssh_port,
      image_name, 
      gpu_count, 
      cpu_cores, 
      mem_rate, 
      disk_size,
      vnc_port, 
      rdp_port,
      port_min,
      port_max,
      operation_system,
      bios_mode,
      // multicast,
      network_name,
      time, 
      dbc, 
      account, 
      language 
    } = request.body
    if (machine_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      // 判断存储金额是否正确
      // 1.查询机器信息
      const virtualInfo = conn.db("identifier").collection("virMachineInfo")
      const orderArr = await virtualInfo.find({_id: machine_id}).toArray()
      const orderinfo = orderArr[0]
      if (time > orderinfo.EndTime) {
        response.json({
          success: false,
          code: -8,
          msg: `总剩余时长不能超过${orderinfo.EndTime}小时`,
          content: id
        })
        return
      }

      // 2.查询加价信息
      const Percentage = conn.db("identifier").collection("DBCPercentage")
      const PercentageArr = await Percentage.find({_id: 'percentage'}).toArray()
      const PercentageInfo = PercentageArr.length ? PercentageArr[0].percentage_signle : 0

      const GPUPrice = await standardGPUPointPrice()
      const GPUPointPrice = GPUPrice ? GPUPrice.gpu_price/1000000 : 0.028229
      let DBCprice1 = await dbcPriceOcw()
      let dbc_price = DBCprice1/1000000
      let singleCardHour;
      singleCardHour = getnum((Number(orderinfo.calc_point)/100*GPUPointPrice * (1 + PercentageInfo/100)/dbc_price)/orderinfo.gpu_num/24)
      let totalCTC = Number(singleCardHour)*Number(time)*gpu_count
      if (dbc < totalCTC) {
        response.json({
          success: false,
          code: -7,
          msg: '转账金额与实际金额不符，请确认是否有误',
          content: id
        })
        return
      }
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
              "ssh_port": String(ssh_port),
              "custom_port": [`tcp,${port_min}-${port_max}`,`udp,${port_min}-${port_max}`],
              "image_name": String(image_name),
              "gpu_count": String(gpu_count),
              "cpu_cores": String(cpu_cores),
              "mem_size": String(mem_rate),
              "disk_size": String(disk_size),
              "vnc_port": String(vnc_port),
              "rdp_port": String(rdp_port),
              "operation_system": String(operation_system),
              "bios_mode": String(bios_mode),
              // "multicast": JSON.parse(multicast),
              "network_name": String(network_name?network_name:''),
              "vm_xml": "",
              "vm_xml_url": ""
            },
            "session_id": orderinfo.session_id,
            "session_id_sign": orderinfo.session_id_sign
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
      const task = conn.db("identifier").collection("virOrderInfo")
      if (VirInfo&&VirInfo.message.task_id&&VirInfo.errcode == 0) {
        await task.insertOne({
          _id: VirInfo.message.task_id,
          belong: machine_id,
          images: image_name,
          port_min: port_min,
          port_max: port_max,
          rdp_port: rdp_port,
          use_sshOrrdp: ssh_port != '' ? ssh_port : rdp_port,
          use_port_min: port_min,
          use_vnc: vnc_port,
          dbc: dbc,
          account: account,
          time: time,
          language: language,
          orderStatus: 1,
          searchHidden: false,
          ...VirInfo.message
        })
        await virtualInfo.updateOne({_id: machine_id}, {$set: {canuseGpu: orderinfo.canuseGpu - gpu_count}})
        response.json({
          code: 10001,
          msg: '创建中',
          success: true,
          content: VirInfo.message.task_id
        })
      } else {
        if (VirInfo.message == 'ssh_port is occupied') {
          await task.insertOne({
            _id: randomWord7(),
            belong: machine_id,
            use_sshOrrdp: ssh_port != '' ? ssh_port : rdp_port,
            message: VirInfo.message
          })
          response.json({
            code: -6,
            msg: 'SSH端口重复，请重新创建',
            success: false
          })
        } else if (VirInfo.message == 'vnc_port is occupied') {
          await task.insertOne({
            _id: randomWord7(),
            belong: machine_id,
            use_vnc: vnc_port,
            message: VirInfo.message
          })
          response.json({
            code: -5,
            msg: 'VNC端口重复，请重新创建',
            success: false
          })
        } else {
          response.json({
            code: -4,
            msg: VirInfo.message,
            success: false
          })
        }
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

// 查询虚拟机订单 订单状态： 1.创建中，未转账 2.创建成功，未转账 3.转账成功，开始使用 4.转账失败，取消订单 5.订单结束 6.创建失败，取消订单
signleRentVir.post('/getSignleVirtual', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { account } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(account) {
      const search = conn.db("identifier").collection("virOrderInfo")
      const searchMac = conn.db("identifier").collection("virMachineInfo")
      let orderArr = await search.find({account: account, searchHidden: {$ne: true}}).project({_id: 0}).sort({"create_time": -1}).toArray()
      let newArr = []
      if (orderArr.length) {
        for (let i = 0; i < orderArr.length; i++) {
          const orderMac = await searchMac.find({ _id: orderArr[i].belong}).project({ _id: 0, session_id: 0, session_id_sign: 0 }).toArray()
          const orderInfo = orderMac.length ? orderMac[0] : {}
          newArr.push({
            ...orderArr[i],
            ...orderInfo
          })
        }
      }
      response.json({
        success: true,
        code: 10001,
        msg: '查询订单成功',
        content: newArr
      })
    }else{
      response.json({
        code: -1,
        msg:'用户未登录',
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

// 修改虚拟机订单状态 status: 2：修改订单状态为2，开始转帐，成功后状态变为3。失败，变为4  6: 修改订单状态为6
signleRentVir.post('/changeSignleVirStatus', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, machine_id, account, status } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id&&machine_id&&account&&status) {
      // 查询虚拟机订单信息
      const VirOrder = conn.db("identifier").collection("virOrderInfo")
      if (status === 6) {
        await VirOrder.updateOne({_id: id}, { $set: {orderStatus: 6, ErrorTime: Date.now()}})
        response.json({
          success: false,
          code: -3,
          msg: '创建失败',
          content: id
        })
        return
      }
      if (status === 4) {
        await VirOrder.updateOne({_id: id}, {$set: {orderStatus: 4, searchHidden: true, ErrorTime: Date.now()}})
        response.json({
          success: false,
          code: -4,
          msg: '转账失败，创建失败',
          content: id
        })
        if (conn != null){
          conn.close()
          conn = null
        }
      }
      if (status === 2) {
        await VirOrder.updateOne({_id: id}, {$set: {orderStatus: 3, startTime: + new Date()}})
        response.json({
          success: true,
          code: 10001,
          msg: '转账成功，开始使用',
          content: id
        })
      }
    }else{
      response.json({
        code: -1,
        msg:'获取参数信息失败',
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

// 定时查询虚拟机状态
signleRentVir.post('/timedQuerySignleTask', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { 
      machine_id,
      task_id
    } = request.body
    if(task_id&&machine_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const search = conn.db("identifier").collection("virOrderInfo")
      const searchMac = conn.db("identifier").collection("virMachineInfo")
      let orderArr = await searchMac.find({_id: machine_id}).toArray()
      let orderinfo = orderArr[0]
      let VirInfo = {}
      try {
        VirInfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/"+ task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "session_id": orderinfo.session_id,
            "session_id_sign": orderinfo.session_id_sign
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
      if (VirInfo && VirInfo.errcode == 0) {
        await search.updateOne({ _id: task_id }, { $set: VirInfo.message })
        let resultArr = await search.find({ _id: task_id }).toArray()
        const orderMac = await searchMac.find({ _id: machine_id }).project({ _id: 0, session_id: 0, session_id_sign: 0 }).toArray()
        const orderInfo = orderMac.length ? orderMac[0] : {}
        response.json({
          code: 10001,
          msg:'获取成功',
          success: true,
          content: {
            ...orderInfo,
            ...resultArr[0]
          }
        })
      } else {
        response.json({
          code: -2,
          msg:'获取失败',
          success: false,
          content: VirInfo.message
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

// 续费
signleRentVir.post('/renewRentSignle', urlEcode, async (request, response ,next) => {
  let conn = null;
  const { id, machine_id, add_hour, dbc, account } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id&&machine_id&&add_hour&&dbc&&account) {
      // 查询机器信息
      const search = conn.db("identifier").collection("virMachineInfo")
      const orderArr = await search.find({_id: machine_id}).toArray()
      const orderinfo = orderArr[0]
      // 查询虚拟机订单信息
      const VirOrder = conn.db("identifier").collection("virOrderInfo")
      const VirOrderArr = await VirOrder.find({_id: id}).toArray()
      const VirOrderInfo = VirOrderArr[0]
      // 查询加价信息
      const Percentage = conn.db("identifier").collection("DBCPercentage")
      const PercentageArr = await Percentage.find({_id: 'percentage'}).toArray()
      const PercentageInfo = PercentageArr.length ? PercentageArr[0].percentage_signle : 0

      const GPUPrice = await standardGPUPointPrice()
      const GPUPointPrice = GPUPrice ? GPUPrice.gpu_price/1000000 : 0.028229
      let DBCprice1 = await dbcPriceOcw()
      let dbc_price = DBCprice1/1000000
      let singleCardHour;
      singleCardHour = getnum((Number(orderinfo.calc_point)/100*GPUPointPrice * (1 + PercentageInfo/100)/dbc_price)/orderinfo.gpu_num/24)
      let totalCTC = Number(singleCardHour)*Number(add_hour)*VirOrderInfo.gpu_count
      if (dbc < totalCTC) {
        response.json({
          success: false,
          code: -7,
          msg: '转账金额与实际金额不符，请确认是否有误',
          content: id
        })
        return
      }
      if (add_hour > orderinfo.EndTime) {
        response.json({
          success: false,
          code: -8,
          msg: `总剩余时长不能超过${orderinfo.EndTime}小时`,
          content: id
        })
        return
      }
      await VirOrder.updateOne({_id: id}, {$set: {dbc: Number(VirOrderInfo.dbc) + Number(dbc), time: VirOrderInfo.time + add_hour}})
      response.json({
        success: true,
        code: 10001,
        msg: '续费成功',
        content: id
      })
      if (conn != null){
        conn.close()
        conn = null
      }
    }else{
      response.json({
        code: -1,
        msg:'获取参数信息失败',
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

// 创建网络
signleRentVir.post('/createNetwork', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id } = request.body
    if(id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const virtualInfo = conn.db("identifier").collection("virtualInfo")
      let orderArr = await virtualInfo.find({_id: id}).toArray()
      let orderinfo = orderArr[0]
      if (orderinfo.network_name != null && orderinfo.network_name != '') {
        response.json({
          code: 10001,
          msg: '已存在网络名称',
          success: true,
          content: orderinfo.network_name
        })
      } else {
        let network_name = getnetwork();
        let VirInfo = {}
        try {
          VirInfo = await httpRequest({
            url: baseUrl + "/api/v1/lan/create",
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [orderinfo.machine_id], 
              "additional": {
                "network_name": network_name,
                "ip_cidr": "192.168.66.0/24"
              },
              "session_id": orderinfo.session_id,
              "session_id_sign": orderinfo.session_id_sign
            }
          })
        } catch (err) {
          VirInfo = {
            message: err.message
          }
        }
        console.log(VirInfo, 'VirInfo');
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
          await virtualInfo.updateOne({_id: id},{$set:{network_name: network_name}})
          response.json({
            code: 10001,
            msg: '获取网络名称成功',
            success: true,
            content: network_name
          })
        } else {
          response.json({
            code: -2,
            msg: VirInfo.message,
            success: false
          })
        }
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
signleRentVir.post('/restartSignleVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { task_id, machine_id } = request.body
    if(machine_id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const searchMac = conn.db("identifier").collection("virMachineInfo")
      let orderArr = await searchMac.find({_id: machine_id}).toArray()
      let orderinfo = orderArr[0]
      const searchOrder = conn.db("identifier").collection("virOrderInfo")
      let searchOrderArr = await searchOrder.find({_id: task_id}).toArray()
      let searchOrderInfo = searchOrderArr[0]
      if (searchOrderInfo.startTime + searchOrderInfo.time*60*60*1000 < Date.now()) {
        response.json({
          code: -3,
          msg: '租用已到期，无操作权限',
          success: false
        })
        return
      }
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
            "session_id": orderinfo.session_id,
            "session_id_sign": orderinfo.session_id_sign
          }
        })
      } catch (err) {
        taskinfo = {
          message: err.message
        }
      }
      if (taskinfo.errcode != undefined || taskinfo.errcode != null) {
        taskinfo = taskinfo
      } else {
        if (taskinfo.netcongtu || taskinfo.mainnet) {
          if (machine_id.indexOf('CTC') != -1) {
            taskinfo = taskinfo.netcongtu
          } else {
            taskinfo = taskinfo.mainnet
          }
        } else {
          taskinfo = taskinfo
        }
      }
      if (taskinfo&&taskinfo.errcode == 0) {
        response.json({
          code: 10001,
          msg: '操作成功',
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
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
})

// 停止虚拟机
signleRentVir.post('/stopSignleVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { task_id, machine_id } = request.body
    if(machine_id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const searchOrder = conn.db("identifier").collection("virOrderInfo")
      let searchOrderArr = await searchOrder.find({_id: task_id}).toArray()
      let searchOrderInfo = searchOrderArr[0]
      if (searchOrderInfo.startTime + searchOrderInfo.time*60*60*1000 < Date.now()) {
        response.json({
          code: -3,
          msg: '租用已到期，无操作权限',
          success: false
        })
        return
      }
      const searchMac = conn.db("identifier").collection("virMachineInfo")
      let orderArr = await searchMac.find({_id: machine_id}).toArray()
      let orderinfo = orderArr[0]
      let taskinfo = {}
      try {
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/stop/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "session_id": orderinfo.session_id,
            "session_id_sign": orderinfo.session_id_sign
          }
        })
      } catch (err) {
        taskinfo = {
          message: err.message
        }
      }
      if (taskinfo.errcode != undefined || taskinfo.errcode != null) {
        taskinfo = taskinfo
      } else {
        if (taskinfo.netcongtu || taskinfo.mainnet) {
          if (machine_id.indexOf('CTC') != -1) {
            taskinfo = taskinfo.netcongtu
          } else {
            taskinfo = taskinfo.mainnet
          }
        } else {
          taskinfo = taskinfo
        }
      }
      if (taskinfo&&taskinfo.errcode == 0) {
        response.json({
          code: 10001,
          msg: '停止成功',
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
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
})

// 启动虚拟机
signleRentVir.post('/startSignleVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { task_id, machine_id } = request.body
    if(machine_id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const searchOrder = conn.db("identifier").collection("virOrderInfo")
      let searchOrderArr = await searchOrder.find({_id: task_id}).toArray()
      let searchOrderInfo = searchOrderArr[0]
      if (searchOrderInfo.startTime + searchOrderInfo.time*60*60*1000 < Date.now()) {
        response.json({
          code: -3,
          msg: '租用已到期，无操作权限',
          success: false
        })
        return
      }
      const searchMac = conn.db("identifier").collection("virMachineInfo")
      let orderArr = await searchMac.find({_id: machine_id}).toArray()
      let orderinfo = orderArr[0]
      let taskinfo = {}
      try {
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/start/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "session_id": orderinfo.session_id,
            "session_id_sign": orderinfo.session_id_sign
          }
        })
      } catch (err) {
        taskinfo = {
          message: err.message
        }
      }
      if (taskinfo.errcode != undefined || taskinfo.errcode != null) {
        taskinfo = taskinfo
      } else {
        if (taskinfo.netcongtu || taskinfo.mainnet) {
          if (machine_id.indexOf('CTC') != -1) {
            taskinfo = taskinfo.netcongtu
          } else {
            taskinfo = taskinfo.mainnet
          }
        } else {
          taskinfo = taskinfo
        }
      }
      if (taskinfo&&taskinfo.errcode == 0) {
        response.json({
          code: 10001,
          msg: '启动中',
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
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
})

// 修改虚拟机
signleRentVir.post('/editVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { 
      id,
      task_id, 
      machine_id, 
      new_ssh_port, 
      new_vnc_port, 
      new_rdp_port, 
      port_min, 
      port_max, 
      new_gpu_count,
      new_cpu_cores,
      new_mem_size,
      increase_disk_size} = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const virtualInfo = conn.db("identifier").collection("virtualInfo")
      let orderArr = await virtualInfo.find({_id: id}).toArray()
      let orderinfo = orderArr[0]
      let taskinfo = {}
      try {
        let perams = {
          "new_ssh_port": String(new_ssh_port),
          "new_vnc_port": String(new_vnc_port),
          "new_rdp_port": String(new_rdp_port),
          "new_custom_port": [`tcp,${port_min}-${port_max}`,`udp,${port_min}-${port_max}`],
          "new_gpu_count": String(new_gpu_count),  // >= 0
          "new_cpu_cores": String(new_cpu_cores),  // > 0, 单位G
          "new_mem_size": String(new_mem_size),  // > 0, 单位G
        }
        if (increase_disk_size) {
          perams.increase_disk_size = String(increase_disk_size)
        }
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/modify/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": perams,
            "session_id": orderinfo.session_id,
            "session_id_sign": orderinfo.session_id_sign
          }
        })
      } catch (err) {
        taskinfo = {
          message: err.message
        }
      }
      if (taskinfo.errcode != undefined || taskinfo.errcode != null) {
        taskinfo = taskinfo
      } else {
        if (taskinfo.netcongtu || taskinfo.mainnet) {
          if (machine_id.indexOf('CTC') != -1) {
            taskinfo = taskinfo.netcongtu
          } else {
            taskinfo = taskinfo.mainnet
          }
        } else {
          taskinfo = taskinfo
        }
      }
      if (taskinfo&&taskinfo.errcode == 0) {
        const task = conn.db("identifier").collection("virtualTask")
        await task.updateOne({_id: task_id}, {$set:{
          port_min: port_min,
          port_max: port_max,
          rdp_port: new_rdp_port,
        }})
        response.json({
          code: 10001,
          msg: '修改成功',
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
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
})
