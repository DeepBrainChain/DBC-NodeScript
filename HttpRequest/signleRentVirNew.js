import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { typeJson, wssChain, mongoUrlSeed, baseUrl } from '../publicResource.js'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, randomAsU8a, signatureVerify } from '@polkadot/util-crypto';
import { BN_TEN, u8aToHex } from '@polkadot/util';
import httpRequest from 'request-promise';
import BN from 'bn.js'
import { decryptByAes256 } from '../testScript/crypto.js'
const mongoUrl = decryptByAes256(mongoUrlSeed)
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

// 获取用户订单号
export const getOrderId = async (wallet) => {
  await GetApi()
  let de = await api.query.rentMachine.userOrder(wallet);
  let de_data =  de.toJSON();
  const orderId = de_data.length ? de_data[de_data.length - 1] : ''
  return orderId
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

// nonce生成
const createNonce = () => {
  let str = "",
  arr = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z','0', '1', '2', '3', '4', '5', '6', '7', '8', '9',];
  
  for (let i = 0; i < 55; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}

// 创建签名
const CreateSignature = async (seed) => {
  let nonce = createNonce()
  await cryptoWaitReady()
  let signUrl = await keyring.addFromUri(seed)
  const signature = u8aToHex(signUrl.sign(nonce))
  return { nonce, signature }
}

const CreateSignature1 = async (seed, nonce) => {
  await cryptoWaitReady()
  let signUrl = await keyring.addFromUri(seed)
  const signature = u8aToHex(signUrl.sign(nonce))
  return { nonce, signature }
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
    const findPort = await virOrder.aggregate([{$group:{_id:"$machine_id", use_sshOrrdp:{ $addToSet:'$use_sshOrrdp'}, use_port_min:{ $addToSet:'$use_port_min'}, use_vnc:{ $addToSet:'$use_vnc'}}}]).toArray()
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
    const id = request.body.id
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

/**
 * 创建虚拟机租用订单
 *   订单状态：
 *    0：空闲订单
 *    1：已支付，待租用链上机器
 *    2：链上机器租用成功，待确认租用（15分钟期间创建成功即租用）,此时创建创建虚拟机 （机器状态：hasSignle: true，CanUseGpu更改 ）
 *    3：创建成功正在使用中
 *    4：订单结束 （如果CanUseGpu等于机器的原始数目，hasSignle变为false）
 *    5：订单由于无法创建虚拟机取消(如果CanUseGpu等于机器的原始数目，hasSignle变为false,此时需要等15分钟才会开始退币)
 *    errRefund：退币异常
 *    6: 重新租用，创建虚拟机
 */
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
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
      // 虚拟机订单-生成一个唯一订单号（订单+时间戳+钱包账号）
      const virtualInfo = await conn.db("identifier").collection("virOrderInfo")
      // 临时钱包信息
      const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await wallet.find({_id: machine_id+account}).toArray()
      const walletinfo = walletArr[0]
      // 获取订单号 - 1.已创建但未使用的订单号 2.新的订单号
      const getOdArr = await virtualInfo.find({orderStatus: 0}).toArray()
      let virOrderId = ''
      if (getOdArr.length) {
        virOrderId = getOdArr[0]._id
        await virtualInfo.updateOne({ _id: virOrderId },{ $set: {
          orderStatus: 1,
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
          images: image_name,
          use_sshOrrdp: ssh_port ? ssh_port : rdp_port,
          use_port_min: port_min,
          use_vnc: vnc_port,
          time, 
          dbc, 
          account, 
          language 
        }})
      } else {
        virOrderId = `VM${Date.now()}${account}`
        await virtualInfo.insertOne({
          _id: virOrderId,
          orderStatus: 1,
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
          images: image_name,
          use_sshOrrdp: ssh_port ? ssh_port : rdp_port,
          use_port_min: port_min,
          use_vnc: vnc_port,
          time, 
          dbc, 
          account, 
          language 
        })
      }
      // 租用机器
      await GetApi()
      let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .rentMachine( machine_id, gpu_count, Number(time)*120 )
      .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] }}) => {
            if (error.isModule && method == 'ExtrinsicFailed') {
              const decoded = await api.registry.findMetaError(error.asModule)
              const siPower = new BN(15)
              const bob = inputToBn(String(dbc-11), siPower, 15)
              await cryptoWaitReady();
              await api.tx.balances
              .transfer( account, bob )
              .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
                if (status.isInBlock) {
                  events.forEach( async ({ event: { method, data: [error] } }) => {
                    if (conn == null) {
                      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                    }
                    const virtualInfo1 = await conn.db("identifier").collection("virOrderInfo")
                    if (error.isModule && method == 'ExtrinsicFailed') {
                      await virtualInfo1.updateOne({ _id: virOrderId }, {$set: { orderStatus: 0, errRefund: true }})
                      response.json({
                        success: false,
                        code: -3,
                        msg: decoded.method + '创建待确认租用订单失败，退币失败，请联系客服处理',
                        content: virOrderId
                      })
                      if (conn != null) {
                        conn.close()
                        conn = null
                      }
                    } else if (method == 'ExtrinsicSuccess'){
                      await virtualInfo1.updateOne({ _id: virOrderId }, {$set: { orderStatus: 0 }})
                      response.json({
                        success: false,
                        code: -2,
                        msg: decoded.method + '创建待确认租用订单失败，DBC已退回原账户',
                        content: virOrderId
                      })
                      if (conn != null){
                        conn.close()
                        conn = null
                      }
                    }
                  });
                }
              }).catch((err) => {
                response.json({
                  code: -8,
                  msg:err.message,
                  success: false
                })
              })
            }else if(method == 'ExtrinsicSuccess'){
              if (conn == null) {
                conn = await MongoClient.connect(url, { useUnifiedTopology: true })
              }
              const virtualInfo2 = await conn.db("identifier").collection("virOrderInfo")
              // 机器原始信息
              const macdetail = await conn.db("identifier").collection("MachineDetailsInfo")
              const OrderId = await getOrderId(walletinfo.wallet)
              await virtualInfo2.updateOne({_id: virOrderId}, {$set:{orderStatus: 2, OrderId: OrderId, createTime: Date.now()}})
              const macinfoArr = await macdetail.find({_id: machine_id}).toArray()
              // 单个租用后，将机器设置为已被单个租用，并设置剩余可用GPU数量
              await macdetail.updateOne({_id: machine_id}, {$set: {hasSignle: true, CanUseGpu: Number(macinfoArr[0].CanUseGpu) - Number(gpu_count)}})
              // 创建虚拟机所需要的session
              let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
              let newsession = {}
              try {
                newsession = await httpRequest({
                  url: baseUrl + "/api/v1/mining_nodes/session_id",
                  method: "post",
                  json: true,
                  headers: {},
                  body: {
                    "peer_nodes_list": [machine_id], 
                    "additional": { },
                    "nonce": nonce1,
                    "sign": sign1,
                    "wallet": walletinfo.wallet,
                    "rent_order": String(OrderId)
                  }
                })
              } catch (err) {
                newsession = {
                  message: err.message
                }
              }
              if (newsession.errcode != undefined || newsession.errcode != null) {
                newsession = newsession
              } else {
                if (newsession.netcongtu || newsession.mainnet) {
                  if (machine_id.indexOf('CTC') != -1) {
                    newsession = newsession.netcongtu
                  } else {
                    newsession = newsession.mainnet
                  }
                } else {
                  newsession = newsession
                }
              }
              if (newsession&&newsession.errcode == 0) {
                if (conn == null) {
                  conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                }
                const virtualInfo3 = await conn.db("identifier").collection("virOrderInfo")
                let { nonce: nonce1, signature: sign1 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
                await virtualInfo3.updateOne({_id: virOrderId}, {$set: {
                  session_id: nonce1,
                  session_id_sign: sign1
                }})
                response.json({
                  success: true,
                  code: 10001,
                  msg: '创建待确认租用订单成功,创建session成功',
                  content: virOrderId
                })
                if (conn != null){
                  conn.close()
                  conn = null
                }
              } else {
                response.json({
                  success: true,
                  code: 10001,
                  msg: '创建待确认租用订单成功,创建session失败',
                  content: virOrderId
                })
              }
              if (conn != null){
                conn.close()
                conn = null
              }
            }
          });
        }
      }).catch((err) => {
        response.json({
          code: -8,
          msg:err.message,
          success: false
        })
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

// 创建虚拟机，针对状态为 待确认租用 状态订单，创建中
signleRentVir.post('/createSignleVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { 
      virOrderId,
      machine_id,
      account
    } = request.body
    if (machine_id) {
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
      const orderInfo = await conn.db("identifier").collection("virOrderInfo")
      const orderArr = await orderInfo.find({_id: virOrderId}).toArray()
      const ordercon = orderArr[0]
      const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await wallet.find({_id: machine_id+account}).toArray()
      const walletinfo = walletArr[0]
      let requestData = {}
      if (ordercon.session_id && ordercon.session_id_sign) {
        requestData = {
          "session_id": ordercon.session_id,
          "session_id_sign": ordercon.session_id_sign,
        }
      } else {
        // 创建虚拟机所需要的session
        let { nonce: nonce2, signature: sign2 } = await CreateSignature(walletinfo.seed)
        let newsession = {}
        try {
          newsession = await httpRequest({
            url: baseUrl + "/api/v1/mining_nodes/session_id",
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": { },
              "nonce": nonce2,
              "sign": sign2,
              "wallet": walletinfo.wallet,
              "rent_order": String(ordercon.OrderId)
            }
          })
        } catch (err) {
          newsession = {
            message: err.message
          }
        }
        if (newsession.errcode != undefined || newsession.errcode != null) {
          newsession = newsession
        } else {
          if (newsession.netcongtu || newsession.mainnet) {
            if (machine_id.indexOf('CTC') != -1) {
              newsession = newsession.netcongtu
            } else {
              newsession = newsession.mainnet
            }
          } else {
            newsession = newsession
          }
        }
        if (newsession&&newsession.errcode == 0) {
          if (conn == null) {
            conn = await MongoClient.connect(url, { useUnifiedTopology: true })
          }
          const orderInfo1 = await conn.db("identifier").collection("virOrderInfo")
          let { nonce: nonce1, signature: sign1 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
          await orderInfo1.updateOne({_id: virOrderId}, {$set: {
            session_id: nonce1,
            session_id_sign: sign1
          }})
          if (conn != null){
            conn.close()
            conn = null
          }
        }
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        requestData = {
          "nonce": nonce1,
          "sign": sign1,
          "wallet": walletinfo.wallet,
        }
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
              "ssh_port": String(ordercon.ssh_port),
              "custom_port": [`tcp,${ordercon.port_min}-${ordercon.port_max}`,`udp,${ordercon.port_min}-${ordercon.port_max}`],
              "image_name": String(ordercon.image_name),
              "gpu_count": String(ordercon.gpu_count),
              "cpu_cores": String(ordercon.cpu_cores),
              "mem_size": String(ordercon.mem_rate),
              "disk_size": String(ordercon.disk_size),
              "vnc_port": String(ordercon.vnc_port),
              "rdp_port": String(ordercon.rdp_port),
              "operation_system": String(ordercon.operation_system),
              "bios_mode": String(ordercon.bios_mode),
              // "multicast": JSON.parse(multicast),
              "network_name": String(ordercon.network_name?ordercon.network_name:''),
              "vm_xml": "",
              "vm_xml_url": ""
            },
            ...requestData,
            "rent_order": String(ordercon.OrderId)
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
      if (VirInfo&&VirInfo.message.task_id&&VirInfo.errcode == 0) {
        if (conn == null) {
          conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        }
        const orderInfo1 = await conn.db("identifier").collection("virOrderInfo")
        await orderInfo1.updateOne({_id: virOrderId}, {$set : {
          task_id: VirInfo.message.task_id,
          images: ordercon.image_name,
          use_sshOrrdp: ordercon.ssh_port ? ordercon.ssh_port : ordercon.rdp_port,
          use_port_min: ordercon.port_min,
          use_vnc: ordercon.vnc_port,
          ...VirInfo.message
        }})
        response.json({
          code: 10001,
          msg: '创建中',
          success: true,
          content: virOrderId
        })
        if (conn != null){
          conn.close()
          conn = null
        }
      } else {
        if (conn == null) {
          conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        }
        const orderInfo2 = await conn.db("identifier").collection("virOrderInfo")
        if (VirInfo.message == 'ssh_port is occupied' || VirInfo.message.indexOf('port conflict, exist ssh_port') != -1 || VirInfo.message.indexOf('port conflict, exist rdp_port') != -1) {
          await orderInfo2.insertOne({
            _id: randomWord7(),
            machine_id: machine_id,
            use_sshOrrdp: ordercon.ssh_port ? ordercon.ssh_port : ordercon.rdp_port,
            message: VirInfo.message
          })
          if (ordercon.bios_mode == 'uefi') {
            await orderInfo2.updateOne({_id: virOrderId}, {$set : { rdp_port: Number(ordercon.rdp_port)+1 }})
          } else {
            await orderInfo2.updateOne({_id: virOrderId}, {$set : { ssh_port: Number(ordercon.ssh_port)+1 }})
          }
          response.json({
            code: -6,
            msg: 'SSH端口重复，请重新创建',
            success: false
          })
        } else if (VirInfo.message == 'vnc_port is occupied' || VirInfo.message.indexOf('port conflict, exist vnc_port') != -1) {
          await orderInfo2.updateOne({_id: virOrderId}, {$set : { vnc_port: Number(ordercon.vnc_port)+1 }})
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
        if (conn != null){
          conn.close()
          conn = null
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

/**
 * 修改虚拟机状态
 * 初始状态为 2（虚拟机还未创建或者创建中）
 * 如果虚拟机创建不成功，取消订单 状态由2变成5，订单进入定时任务，15分钟后开始执行退币操作
 * 虚拟机创建成功 状态由 2变成3,并确认租用机器，订单开始计时，租用到期后，状态变为4，订单结束
 */
 signleRentVir.post('/changeSignleVirStatus', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { virOrderId, status } = request.body
    if (conn == null) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    }
    if(virOrderId&&status) {
      // 查询虚拟机订单信息
      const VirOrder = await conn.db("identifier").collection("virOrderInfo")
      if (status === 5) {
        await VirOrder.updateOne({_id: virOrderId}, { $set: {orderStatus: 5, ErrorTime: Date.now()}})
        response.json({
          success: false,
          code: -3,
          msg: '创建失败',
          content: virOrderId
        })
        return
      }
      if (status === 2) {
        await VirOrder.updateOne({_id: virOrderId}, {$set: {orderStatus: 3}})
        response.json({
          success: true,
          code: 10001,
          msg: '创建成功，开始使用',
          content: virOrderId
        })
        return
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
      virOrderId,
      machine_id,
      task_id,
      account
    } = request.body
    if(task_id&&machine_id) {
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
      const orderInfo = await conn.db("identifier").collection("virOrderInfo")
      const orderArr = await orderInfo.find({_id: virOrderId}).toArray()
      const ordercon = orderArr[0]
      const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await wallet.find({_id: machine_id+account}).toArray()
      const walletinfo = walletArr[0]
      let requestData = {}
      if (ordercon.session_id && ordercon.session_id_sign) {
        requestData = {
          "session_id": ordercon.session_id,
          "session_id_sign": ordercon.session_id_sign,
        }
      } else {
        // 创建虚拟机所需要的session
        let { nonce: nonce2, signature: sign2 } = await CreateSignature(walletinfo.seed)
        let newsession = {}
        try {
          newsession = await httpRequest({
            url: baseUrl + "/api/v1/mining_nodes/session_id",
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": { },
              "nonce": nonce2,
              "sign": sign2,
              "wallet": walletinfo.wallet,
              "rent_order": String(ordercon.OrderId)
            }
          })
        } catch (err) {
          newsession = {
            message: err.message
          }
        }
        if (newsession.errcode != undefined || newsession.errcode != null) {
          newsession = newsession
        } else {
          if (newsession.netcongtu || newsession.mainnet) {
            if (machine_id.indexOf('CTC') != -1) {
              newsession = newsession.netcongtu
            } else {
              newsession = newsession.mainnet
            }
          } else {
            newsession = newsession
          }
        }
        if (newsession&&newsession.errcode == 0) {
          if (conn == null) {
            conn = await MongoClient.connect(url, { useUnifiedTopology: true })
          }
          const orderInfo1 = await conn.db("identifier").collection("virOrderInfo")
          let { nonce: nonce1, signature: sign1 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
          await orderInfo1.updateOne({_id: virOrderId}, {$set: {
            session_id: nonce1,
            session_id_sign: sign1
          }})
          if (conn != null){
            conn.close()
            conn = null
          }
        }
        let { nonce: nonce3, signature: sign3 } = await CreateSignature(walletinfo.seed)
        requestData = {
          "nonce": nonce3,
          "sign": sign3,
          "wallet": walletinfo.wallet,
        }
      }
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
            ...requestData,
            "rent_order": String(ordercon.OrderId)
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
        if (conn == null) {
          conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        }
        const orderInfo1 = await conn.db("identifier").collection("virOrderInfo")
        const searchMac = conn.db("identifier").collection("MachineDetailsInfo")
        const orderMac = await searchMac.find({ _id: machine_id}).project({ _id: 0}).toArray()
        const MacInfo = orderMac.length ? orderMac[0] : {}
        await orderInfo1.updateOne({_id: virOrderId}, {$set : VirInfo.message})
        let resultArr = await orderInfo1.find({ _id: virOrderId }).toArray()
        response.json({
          code: 10001,
          msg: '获取成功',
          success: true,
          content: {
            ...resultArr[0],
            ...MacInfo
          }
        })
        if (conn != null){
          conn.close()
          conn = null
        }
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

// 获取虚拟机订单
signleRentVir.post('/getSignleVirtual', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { account } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(account) {
      const search = conn.db("identifier").collection("virOrderInfo")
      const searchMac = conn.db("identifier").collection("MachineDetailsInfo")
      let orderArr = await search.find({account: account, orderStatus: {$in:[2, 3, 4, 5, 6]}, searchHidden: {$ne: true}}).sort({"create_time": -1}).toArray()
      let newArr = []
      if (orderArr.length) {
        for (let i = 0; i < orderArr.length; i++) {
          const orderMac = await searchMac.find({ _id: orderArr[i].machine_id}).project({ _id: 0}).toArray()
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

// 确认租用
signleRentVir.post('/confirmRent', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { virOrderId } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (virOrderId) {
      const orderInfo = await conn.db("identifier").collection("virOrderInfo")
      const virOrderArr = await orderInfo.find({_id: virOrderId}).toArray()
      const virOrderInfo = virOrderArr[0]
      if (virOrderInfo.confirmRent) {
        response.json({
          success: true,
          code: 10001,
          msg: '租用成功，订单转为正在使用中',
          content: virOrderId
        })
        return true
      }
      const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await wallet.find({_id: virOrderInfo.machine_id + virOrderInfo.account}).toArray()
      const walletinfo = walletArr[0]
      await GetApi()
      const accountFromKeyring = keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .confirmRent( virOrderInfo.OrderId )
      .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] }}) => {
            if (error.isModule && method == 'ExtrinsicFailed') {
              const decoded = await api.registry.findMetaError(error.asModule)
              response.json({
                success: false,
                code: -2,
                msg: decoded.method + '-->租用失败，请重试',
                content: virOrderId
              })
              if (conn != null){
                conn.close()
                conn = null
              }
            } else if (method == 'ExtrinsicSuccess') {
              if (conn == null) {
                conn = await MongoClient.connect(url, { useUnifiedTopology: true })
              }
              const virtualInfo1 = await conn.db("identifier").collection("virOrderInfo")
              await virtualInfo1.updateOne({_id: virOrderId}, {$set:{ confirmRent: true }})
              response.json({
                success: true,
                code: 10001,
                msg: '租用成功，订单转为正在使用中',
                content: virOrderId
              })
              if (conn != null) {
                conn.close()
                conn = null
              }
            }
          });
        }
      }).catch((err) => {
        response.json({
          code: -8,
          msg:err.message,
          success: false
        })
      })
    } else {
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
      if (conn != null) {
        conn.close()
        conn = null
      }
    }
  } catch (error) {
    response.json({
      code: -10001,
      msg:error.message,
      success: false
    })
    if (conn != null) {
      conn.close()
      conn = null
    }
  }
})

// 续费
signleRentVir.post('/renewRentSignle', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { virOrderId, machine_id, add_hour, dbc, account, rent_order } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(virOrderId&&add_hour&&dbc&&machine_id) {
      const search = conn.db("identifier").collection("virOrderInfo")
      const getwallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await getwallet.find({_id: machine_id+account}).toArray()
      const walletinfo = walletArr[0]
      const orderArr = await search.find({_id: virOrderId}).toArray()
      const orderinfo = orderArr[0]
      await GetApi()
      let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .reletMachine( rent_order, Number(add_hour)*120 )
      .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] }}) => {
            if (error.isModule && method == 'ExtrinsicFailed') {
              const decoded = await api.registry.findMetaError(error.asModule)
              const siPower = new BN(15)
              const bob = inputToBn(String(dbc), siPower, 15)
              await cryptoWaitReady();
              await api.tx.balances
              .transfer( account, bob )
              .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
                if (status.isInBlock) {
                  events.forEach( async ({ event: { method, data: [error] } }) => {
                    if (error.isModule && method == 'ExtrinsicFailed') {
                      response.json({
                        success: false,
                        code: -3,
                        msg: decoded.method + '-->续费失败,DBC退币失败，请联系客服处理',
                        content: id
                      })
                      if (conn != null){
                        conn.close()
                        conn = null
                      }
                    }else if (method == 'ExtrinsicSuccess') {
                      response.json({
                        success: false,
                        code: -2,
                        msg: decoded.method + '-->续费失败，DBC已退回原账户',
                        content: id
                      })
                      if (conn != null){
                        conn.close()
                        conn = null
                      }
                    }
                  });
                }
              }).catch((err) => {
                response.json({
                  code: -8,
                  msg:err.message,
                  success: false
                })
              })
            }else if(method == 'ExtrinsicSuccess'){
              if (conn == null) {
                conn = await MongoClient.connect(url, { useUnifiedTopology: true })
              }
              const virtualInfo1 = await conn.db("identifier").collection("virOrderInfo")
              await virtualInfo1.updateOne({_id: virOrderId}, {$set:{ dbc: (Number(orderinfo.dbc) + Number(dbc)), time: (Number(orderinfo.time) + Number(add_hour))}})
              response.json({
                success: true,
                code: 10001,
                msg: '续费成功',
                content: virOrderId
              })
              if (conn != null){
                conn.close()
                conn = null
              }
            }
          });
        }
      }).catch((err) => {
        response.json({
          code: -8,
          msg:err.message,
          success: false
        })
      })
    } else {
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
      if (conn != null){
        conn.close()
        conn = null
      }
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

// 再次租用
signleRentVir.post('/rentagain', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { virOrderId, machine_id, add_hour, dbc, account, gpu_count } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(virOrderId&&account&&add_hour&&dbc&&machine_id&&gpu_count) {
      const getwallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await getwallet.find({_id: machine_id+account}).toArray()
      const walletinfo = walletArr[0]
      // 租用机器
      await GetApi()
      let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .rentMachine( machine_id, gpu_count, Number(add_hour)*120 )
      .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] }}) => {
            if (error.isModule && method == 'ExtrinsicFailed') {
              const decoded = await api.registry.findMetaError(error.asModule)
              const siPower = new BN(15)
              const bob = inputToBn(String(dbc-11), siPower, 15)
              await cryptoWaitReady();
              await api.tx.balances
              .transfer( account, bob )
              .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
                if (status.isInBlock) {
                  events.forEach( async ({ event: { method, data: [error] } }) => {
                    if (error.isModule && method == 'ExtrinsicFailed') {
                      if (conn == null) {
                        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                      }
                      const virtualInfo1 = await conn.db("identifier").collection("virOrderInfo")
                      await virtualInfo1.updateOne({ _id: virOrderId }, {$set: { errRefund: true }})
                      response.json({
                        success: false,
                        code: -3,
                        msg: decoded.method + '创建待确认租用订单失败，退币失败，请联系客服处理',
                        content: virOrderId
                      })
                      if (conn != null) {
                        conn.close()
                        conn = null
                      }
                    } else if (method == 'ExtrinsicSuccess'){
                      response.json({
                        success: false,
                        code: -2,
                        msg: decoded.method + '创建待确认租用订单失败，DBC已退回原账户',
                        content: virOrderId
                      })
                      if (conn != null){
                        conn.close()
                        conn = null
                      }
                    }
                  });
                }
              }).catch((err) => {
                response.json({
                  code: -8,
                  msg:err.message,
                  success: false
                })
              })
            }else if(method == 'ExtrinsicSuccess'){
              if (conn == null) {
                conn = await MongoClient.connect(url, { useUnifiedTopology: true })
              }
              const virtualInfo2 = await conn.db("identifier").collection("virOrderInfo")
              // 机器原始信息
              const macdetail = await conn.db("identifier").collection("MachineDetailsInfo")
              const OrderId = await getOrderId(walletinfo.wallet)
              await virtualInfo2.updateOne({_id: virOrderId}, {$set:{orderStatus: 6, time: add_hour, dbc: dbc, OrderId: OrderId, createTime: Date.now()}})
              const macinfoArr = await macdetail.find({_id: machine_id}).toArray()
              // 单个租用后，将机器设置为已被单个租用，并设置剩余可用GPU数量
              await macdetail.updateOne({_id: machine_id}, {$set: {hasSignle: true, CanUseGpu: Number(macinfoArr[0].CanUseGpu) - Number(gpu_count)}})
              // 创建虚拟机所需要的session
              let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
              let newsession = {}
              try {
                newsession = await httpRequest({
                  url: baseUrl + "/api/v1/mining_nodes/session_id",
                  method: "post",
                  json: true,
                  headers: {},
                  body: {
                    "peer_nodes_list": [machine_id], 
                    "additional": { },
                    "nonce": nonce1,
                    "sign": sign1,
                    "wallet": walletinfo.wallet,
                    "rent_order": String(OrderId)
                  }
                })
              } catch (err) {
                newsession = {
                  message: err.message
                }
              }
              if (newsession.errcode != undefined || newsession.errcode != null) {
                newsession = newsession
              } else {
                if (newsession.netcongtu || newsession.mainnet) {
                  if (machine_id.indexOf('CTC') != -1) {
                    newsession = newsession.netcongtu
                  } else {
                    newsession = newsession.mainnet
                  }
                } else {
                  newsession = newsession
                }
              }
              if (newsession&&newsession.errcode == 0) {
                if (conn == null) {
                  conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                }
                const virtualInfo3 = await conn.db("identifier").collection("virOrderInfo")
                let { nonce: nonce1, signature: sign1 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
                await virtualInfo3.updateOne({_id: virOrderId}, {$set: {
                  session_id: nonce1,
                  session_id_sign: sign1
                }})
                response.json({
                  success: true,
                  code: 10001,
                  msg: '创建待确认租用订单成功,创建session成功',
                  content: virOrderId
                })
                if (conn != null){
                  conn.close()
                  conn = null
                }
              } else {
                response.json({
                  success: true,
                  code: 10001,
                  msg: '创建待确认租用订单成功,创建session失败',
                  content: virOrderId
                })
              }
              if (conn != null){
                conn.close()
                conn = null
              }
            }
          });
        }
      }).catch((err) => {
        response.json({
          code: -8,
          msg:err.message,
          success: false
        })
      })
    } else {
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
      if (conn != null){
        conn.close()
        conn = null
      }
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
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
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
          if (conn == null) {
            conn = await MongoClient.connect(url, { useUnifiedTopology: true })
          }
          const virtualInfo1 = conn.db("identifier").collection("virtualInfo")
          await virtualInfo1.updateOne({_id: id},{$set:{network_name: network_name}})
          response.json({
            code: 10001,
            msg: '获取网络名称成功',
            success: true,
            content: network_name
          })
          if (conn != null){
            conn.close()
            conn = null
          }
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
    const { virOrderId, task_id, machine_id, account } = request.body
    if(virOrderId&&machine_id&&task_id&&account) {
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
      const orderInfo = await conn.db("identifier").collection("virOrderInfo")
      const orderArr = await orderInfo.find({_id: virOrderId}).toArray()
      const ordercon = orderArr[0]
      const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await wallet.find({_id: machine_id+account}).toArray()
      const walletinfo = walletArr[0]
      let requestData = {}
      if (ordercon.session_id && ordercon.session_id_sign) {
        requestData = {
          "session_id": ordercon.session_id,
          "session_id_sign": ordercon.session_id_sign,
        }
      } else {
        // 创建虚拟机所需要的session
        let { nonce: nonce2, signature: sign2 } = await CreateSignature(walletinfo.seed)
        let newsession = {}
        try {
          newsession = await httpRequest({
            url: baseUrl + "/api/v1/mining_nodes/session_id",
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": { },
              "nonce": nonce2,
              "sign": sign2,
              "wallet": walletinfo.wallet,
              "rent_order": String(ordercon.OrderId)
            }
          })
        } catch (err) {
          newsession = {
            message: err.message
          }
        }
        if (newsession.errcode != undefined || newsession.errcode != null) {
          newsession = newsession
        } else {
          if (newsession.netcongtu || newsession.mainnet) {
            if (machine_id.indexOf('CTC') != -1) {
              newsession = newsession.netcongtu
            } else {
              newsession = newsession.mainnet
            }
          } else {
            newsession = newsession
          }
        }
        if (newsession&&newsession.errcode == 0) {
          if (conn == null) {
            conn = await MongoClient.connect(url, { useUnifiedTopology: true })
          }
          const orderInfo1 = await conn.db("identifier").collection("virOrderInfo")
          let { nonce: nonce1, signature: sign1 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
          await orderInfo1.updateOne({_id: virOrderId}, {$set: {
            session_id: nonce1,
            session_id_sign: sign1
          }})
          if (conn != null){
            conn.close()
            conn = null
          }
        }
        let { nonce: nonce3, signature: sign3 } = await CreateSignature(walletinfo.seed)
        requestData = {
          "nonce": nonce3,
          "sign": sign3,
          "wallet": walletinfo.wallet,
        }
      }
      let VirInfo = {}
      try {
        VirInfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/restart/"+ task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            ...requestData,
            "rent_order": String(ordercon.OrderId)
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
        response.json({
          code: 10001,
          msg: '重启成功',
          success: true,
          content: virOrderId
        })
      } else {
        response.json({
          code: -2,
          msg:'重启失败',
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

// 停止虚拟机
signleRentVir.post('/stopSignleVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { virOrderId, task_id, machine_id, account } = request.body
    if(virOrderId&&machine_id&&task_id&&account) {
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
      const orderInfo = await conn.db("identifier").collection("virOrderInfo")
      const orderArr = await orderInfo.find({_id: virOrderId}).toArray()
      const ordercon = orderArr[0]
      const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await wallet.find({_id: machine_id+account}).toArray()
      const walletinfo = walletArr[0]
      let requestData = {}
      if (ordercon.session_id && ordercon.session_id_sign) {
        requestData = {
          "session_id": ordercon.session_id,
          "session_id_sign": ordercon.session_id_sign,
        }
      } else {
        // 创建虚拟机所需要的session
        let { nonce: nonce2, signature: sign2 } = await CreateSignature(walletinfo.seed)
        let newsession = {}
        try {
          newsession = await httpRequest({
            url: baseUrl + "/api/v1/mining_nodes/session_id",
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": { },
              "nonce": nonce2,
              "sign": sign2,
              "wallet": walletinfo.wallet,
              "rent_order": String(ordercon.OrderId)
            }
          })
        } catch (err) {
          newsession = {
            message: err.message
          }
        }
        if (newsession.errcode != undefined || newsession.errcode != null) {
          newsession = newsession
        } else {
          if (newsession.netcongtu || newsession.mainnet) {
            if (machine_id.indexOf('CTC') != -1) {
              newsession = newsession.netcongtu
            } else {
              newsession = newsession.mainnet
            }
          } else {
            newsession = newsession
          }
        }
        if (newsession&&newsession.errcode == 0) {
          if (conn == null) {
            conn = await MongoClient.connect(url, { useUnifiedTopology: true })
          }
          const orderInfo1 = await conn.db("identifier").collection("virOrderInfo")
          let { nonce: nonce1, signature: sign1 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
          await orderInfo1.updateOne({_id: virOrderId}, {$set: {
            session_id: nonce1,
            session_id_sign: sign1
          }})
          if (conn != null){
            conn.close()
            conn = null
          }
        }
        let { nonce: nonce3, signature: sign3 } = await CreateSignature(walletinfo.seed)
        requestData = {
          "nonce": nonce3,
          "sign": sign3,
          "wallet": walletinfo.wallet,
        }
      }
      let VirInfo = {}
      try {
        VirInfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/poweroff/"+ task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            ...requestData,
            "rent_order": String(ordercon.OrderId)
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
        response.json({
          code: 10001,
          msg: '虚拟机已停止',
          success: true,
          content: virOrderId
        })
      } else {
        response.json({
          code: -2,
          msg:'停止虚拟机失败',
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

// 启动虚拟机
signleRentVir.post('/startSignleVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { virOrderId, task_id, machine_id, account } = request.body
    if(virOrderId&&machine_id&&task_id&&account) {
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
      const orderInfo = await conn.db("identifier").collection("virOrderInfo")
      const orderArr = await orderInfo.find({_id: virOrderId}).toArray()
      const ordercon = orderArr[0]
      const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
      const walletArr = await wallet.find({_id: machine_id+account}).toArray()
      const walletinfo = walletArr[0]
      let requestData = {}
      if (ordercon.session_id && ordercon.session_id_sign) {
        requestData = {
          "session_id": ordercon.session_id,
          "session_id_sign": ordercon.session_id_sign,
        }
      } else {
        // 创建虚拟机所需要的session
        let { nonce: nonce2, signature: sign2 } = await CreateSignature(walletinfo.seed)
        let newsession = {}
        try {
          newsession = await httpRequest({
            url: baseUrl + "/api/v1/mining_nodes/session_id",
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": { },
              "nonce": nonce2,
              "sign": sign2,
              "wallet": walletinfo.wallet,
              "rent_order": String(ordercon.OrderId)
            }
          })
        } catch (err) {
          newsession = {
            message: err.message
          }
        }
        if (newsession.errcode != undefined || newsession.errcode != null) {
          newsession = newsession
        } else {
          if (newsession.netcongtu || newsession.mainnet) {
            if (machine_id.indexOf('CTC') != -1) {
              newsession = newsession.netcongtu
            } else {
              newsession = newsession.mainnet
            }
          } else {
            newsession = newsession
          }
        }
        if (newsession&&newsession.errcode == 0) {
          if (conn == null) {
            conn = await MongoClient.connect(url, { useUnifiedTopology: true })
          }
          const orderInfo1 = await conn.db("identifier").collection("virOrderInfo")
          let { nonce: nonce1, signature: sign1 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
          await orderInfo1.updateOne({_id: virOrderId}, {$set: {
            session_id: nonce1,
            session_id_sign: sign1
          }})
          if (conn != null){
            conn.close()
            conn = null
          }
        }
        let { nonce: nonce3, signature: sign3 } = await CreateSignature(walletinfo.seed)
        requestData = {
          "nonce": nonce3,
          "sign": sign3,
          "wallet": walletinfo.wallet,
        }
      }
      let VirInfo1 = {}
      try {
        VirInfo1 = await httpRequest({
          url: baseUrl + "/api/v1/tasks/"+ task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            ...requestData,
            "rent_order": String(ordercon.OrderId)
          }
        })
      } catch (err) {
        VirInfo1 = {
          message: err.message
        }
      }
      if (VirInfo1.errcode != undefined || VirInfo1.errcode != null) {
        VirInfo1 = VirInfo1
      } else {
        if (VirInfo1.netcongtu || VirInfo1.mainnet) {
          if (machine_id.indexOf('CTC') != -1) {
            VirInfo1 = VirInfo1.netcongtu
          } else {
            VirInfo1 = VirInfo1.mainnet
          }
        } else {
          VirInfo1 = VirInfo1
        }
      }
      if (VirInfo1 && VirInfo1.errcode == 0) {
        if (conn == null) {
          conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        }
        const orderInfo2 = await conn.db("identifier").collection("virOrderInfo")
        if (VirInfo1.message.status == 'running') {
          await orderInfo2.updateOne({_id: virOrderId}, {$set: { status: 'running' }})
          response.json({
            code: 10001,
            msg: '启动成功',
            success: true,
            content: virOrderId
          })
        } else if (VirInfo1.message.status == 'starting') {
          await orderInfo2.updateOne({_id: virOrderId}, {$set: { status: 'starting' }})
          response.json({
            code: 10001,
            msg: '启动成功',
            success: true,
            content: virOrderId
          })
        } else {
          let VirInfo = {}
          let { nonce: nonce4, signature: sign4 } = await CreateSignature(walletinfo.seed)
          let requestData1 = {
            "nonce": nonce4,
            "sign": sign4,
            "wallet": walletinfo.wallet,
          }
          try {
            VirInfo = await httpRequest({
              url: baseUrl + "/api/v1/tasks/start/"+ task_id,
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [machine_id], 
                "additional": {},
                ...requestData1,
                "rent_order": String(ordercon.OrderId)
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
            response.json({
              code: 10001,
              msg: '启动成功',
              success: true,
              content: virOrderId
            })
          } else {
            response.json({
              code: -3,
              msg:'启动失败',
              success: false,
              content: VirInfo.message
            })
          }
        }
        if (conn != null){
          conn.close()
          conn = null
        }
      } else {
        response.json({
          code: -2,
          msg:'启动失败',
          success: false,
          content: VirInfo1.message
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
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
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
        if (conn == null) {
          conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        }
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
        if (conn != null){
          conn.close()
          conn = null
        }
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
