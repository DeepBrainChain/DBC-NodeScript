import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { typeJson, wssChain, mongoUrlSeed, baseUrl } from '../publicResource.js'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, randomAsU8a, signatureVerify, naclBoxKeypairFromSecret, blake2AsHex } from '@polkadot/util-crypto';
import { BN_TEN, u8aToHex, hexToU8a, stringToU8a } from '@polkadot/util';
import nacl from 'tweetnacl'
import httpRequest from 'request-promise';
import BN from 'bn.js'
import { decryptByAes256 } from '../testScript/crypto.js'
const mongoUrl = decryptByAes256(mongoUrlSeed)
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
const urlEcode = bodyParser.json()
// 定义路由
export const rentVirtual = express.Router()
// 链上交互
let api  = null
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
// 验证签名
const Verify = async (msg, sign, wallet) => {
  await cryptoWaitReady();
  let result = await signatureVerify( msg, sign, wallet )
  return result.isValid 
}

// 获取四位随机数
const randomWord = () => {
  let str = "",
  arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = 0; i < 4; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}

// 随机数
const randomWord1 = () => {
  let str = "",
  arr = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l','m', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L','M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ];
  for (let i = 0; i < 55; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
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

const createTaskId = () => {
  let str = "",
  arr = [
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l','m', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', '1', '2', '3', '4', '5', '6', '7', '8', '9'
  ];
  for (let i = 0; i < 21; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return '7' + str;
}


// 加密
export function naclSeal (message, senderBoxSecret, receiverBoxPublic, nonce) {
  return {
    nonce: u8aToHex(nonce),
    sealed: u8aToHex(nacl.box(message, nonce, receiverBoxPublic, senderBoxSecret))
  }; 
}

// 创建账户
export const createAccountFromSeed = async () => {
  if (keyring) {
    await cryptoWaitReady()
    const DBC = randomWord()
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

export const transfer = async ( value, seed, toWallet) => {
  await GetApi();
  const siPower = new BN(15)
  const bob = inputToBn(String(value), siPower, 15)
  let accountFromKeyring = await keyring.addFromUri(seed)
  await cryptoWaitReady();
  await api?.tx.balances
  .transfer( toWallet, bob )
  .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
    if (status.isInBlock) {
      events.forEach(({ event: { method, data: [error] } }) => {
        if (error.isModule && method == 'ExtrinsicFailed') {
          console.log('转账失败');
          transfer(value, seed, toWallet)
        }else if(method == 'ExtrinsicSuccess'){
          console.log('转账成功');
        }
      });
    }
  })
  .catch((res)=>{
    console.log(`${res.message}`);
  })
}

// 获取举报质押金额
export const getStake = async (wallet) => {
  await GetApi()
  let de = await api.query.maintainCommittee.reporterStake(wallet);
  let de_data =  de.toJSON();
  let returnData = {
    staked_amount: de_data.staked_amount / Math.pow(10, 15),
    used_stake: de_data.used_stake / Math.pow(10, 15)
  }
  return returnData
}

// 获取用户订单号
export const getOrderId = async (wallet) => {
  await GetApi()
  let de = await api.query.rentMachine.userOrder(wallet);
  let de_data =  de.toJSON();
  const orderId = de_data.length ? de_data[de_data.length - 1] : ''
  return orderId
}

// 获取租用虚拟机加价百分比
rentVirtual.post('/getPercentage', urlEcode, async (request, response ,next) => {
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
        content: { percentage_signle: 0, percentage_whole: 0 }
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

// 生成、获取 临时钱包及四位随机数
rentVirtual.post('/getWallet', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    let id = request.body.id
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id){
      const test = conn.db("identifier").collection("temporaryWallet")
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

// 生成虚拟机订单 订单状态： 0：待支付 1：已支付，待租用 2：待确认租用 3：正在使用中 4：订单结束 5：订单取消 6.正在退币中，请稍后(只针对订单取消状态之前) errRefund：退币异常
rentVirtual.post('/createVirOrder', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const {id, machine_id, dollar, day, count, dbc, wallet, language } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id&&machine_id&&dollar&&day&&count&&dbc&&wallet) {
      const test = conn.db("identifier").collection("MachineDetailsInfo")
      const search = conn.db("identifier").collection("VirtualInfo")
      let arr = await test.find({_id: machine_id}).toArray()
      let arrinfo = arr[0]
      if (arr.length) {
        let errRefund = false
        let orderStatus = 0
        let createTime = 0
        let searchHidden = false
        let ReportHash = ''
        let ReportNonce = ''
        let errType = ''
        let err_desc = ''
        let reportErr = ''
        let searchOrder = await search.find({_id: id, orderStatus: {$in:[0, 4, 5]}}).toArray()
        if (searchOrder.length) {
          errRefund = searchOrder[0].errRefund ? searchOrder[0].errRefund : false
          orderStatus = searchOrder[0].orderStatus ? searchOrder[0].orderStatus : 0
          createTime = searchOrder[0].createTime ? searchOrder[0].createTime : 0
          searchHidden = searchOrder[0].searchHidden ? searchOrder[0].searchHidden : false
          ReportHash = searchOrder[0].ReportHash ? searchOrder[0].ReportHash : ''
          ReportNonce = searchOrder[0].ReportNonce ? searchOrder[0].ReportNonce : ''
          errType = searchOrder[0].errType ? searchOrder[0].errType : ''
          err_desc = searchOrder[0].err_desc ? searchOrder[0].err_desc : ''
          reportErr = searchOrder[0].reportErr ? searchOrder[0].reportErr : 'ending'
          await search.deleteOne({_id: id})
        }
        let data = {...arrinfo, ...{
          _id: id,
          machine_id,
          dollar,
          day,
          count,
          dbc,
          wallet,
          language,
          orderStatus,
          createTime,
          errRefund,
          searchHidden,
          ReportHash,
          ReportNonce,
          errType,
          err_desc,
          reportErr
        }}
        await search.insertOne(data)
        response.json({
          success: true,
          code: 10001,
          msg: '创建未支付订单成功',
          content: id
        })
      } else {
        response.json({
          code: -2,
          msg: '获取机器信息失败',
          success: false,
          content: machine_id
        })
      }
    }else{
      response.json({
        code: -1,
        msg: '获取参数信息失败',
        success: false,
        content: machine_id
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

// 支付完成，修改状态，租用机器 订单状态： 0：待支付 1：已支付，待租用 2：待确认租用 3：正在使用中 4：订单结束 5：订单取消 6.正在退币中，请稍后(只针对订单取消状态之前) errRefund：退币异常
rentVirtual.post('/rentmachine', urlEcode, async (request, response ,next) => {
  let conn = null;
  const { id } = request.body
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id) {
      const search = conn.db("identifier").collection("VirtualInfo")
      const wallet = conn.db("identifier").collection("temporaryWallet")
      const machineInfo = conn.db("identifier").collection("MachineDetailsInfo")
      await search.updateOne({_id: id}, {$set:{orderStatus: 1}})
      let orderArr = await search.find({_id: id}).toArray()
      let orderinfo = orderArr[0]
      let walletArr = await wallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      await GetApi()
      let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .rentMachine( orderinfo.machine_id, orderinfo.gpu_num, Number(orderinfo.day)*2880 )
      .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] }}) => {
            if (error.isModule && method == 'ExtrinsicFailed') {
              const decoded = await api.registry.findMetaError(error.asModule)
              const siPower = new BN(15)
              const bob = inputToBn(String(orderinfo.dbc-10), siPower, 15)
              await cryptoWaitReady();
              await api.tx.balances
              .transfer( orderinfo.wallet, bob )
              .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
                if (status.isInBlock) {
                  events.forEach( async ({ event: { method, data: [error] } }) => {
                    if (conn == null) {
                      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                    }
                    const search1 = conn.db("identifier").collection("VirtualInfo")
                    if (error.isModule && method == 'ExtrinsicFailed') {
                      await search1.updateOne({_id: id}, {$set:{orderStatus: 0, errRefund: true}})
                      response.json({
                        success: false,
                        code: -3,
                        msg: decoded.method + '创建待确认租用订单失败，退币失败，请联系客服处理',
                        content: id
                      })
                      if (conn != null){
                        conn.close()
                        conn = null
                      }
                    }else if(method == 'ExtrinsicSuccess'){
                      await search1.updateOne({_id: id}, {$set:{orderStatus: 0}})
                      response.json({
                        success: false,
                        code: -2,
                        msg: decoded.method + '创建待确认租用订单失败，DBC已退回原账户',
                        content: id
                      })
                      if (conn != null){
                        conn.close()
                        conn = null
                      }
                    }
                  });
                }
              })
            }else if(method == 'ExtrinsicSuccess'){
              if (conn == null) {
                conn = await MongoClient.connect(url, { useUnifiedTopology: true })
              }
              const search1 = conn.db("identifier").collection("VirtualInfo")
              const machineInfo1 = conn.db("identifier").collection("MachineDetailsInfo")
              const OrderId = await getOrderId(walletinfo.wallet)
              await search1.updateOne({_id: id}, {$set:{orderStatus: 2, OrderId: OrderId, searchHidden: false, createTime: Date.now()}})
              await machineInfo1.updateOne({_id: orderinfo.machine_id}, {$set:{machine_status: 'creating', CanUseGpu: 0}})
              response.json({
                success: true,
                code: 10001,
                msg: '创建待确认租用订单成功',
                content: id
              })
              if (conn != null){
                conn.close()
                conn = null
              }
            }
          });
        }
      })
    }else{
      if (conn == null) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      }
      const search1 = conn.db("identifier").collection("VirtualInfo")
      await search1.updateOne({_id: id}, {$set:{orderStatus: 0, errRefund: true}})
      response.json({
        code: -1,
        msg:'获取参数信息失败',
        success: false
      })
      if (conn != null){
        conn.close()
        conn = null
      }
    }
  } catch (error) {
    const catchError = error
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const search = conn.db("identifier").collection("VirtualInfo")
    const wallet = conn.db("identifier").collection("temporaryWallet")
    await search.updateOne({_id: id}, {$set:{orderStatus: 1}})
    let orderArr = await search.find({_id: id}).toArray()
    let orderinfo = orderArr[0]
    let walletArr = await wallet.find({_id: id}).toArray()
    let walletinfo = walletArr[0]
    await GetApi()
    let accountFromKeyring = await keyring.addFromUri(walletinfo.seed)
    const siPower = new BN(15)
    const bob = inputToBn(String(orderinfo.dbc-10), siPower, 15)
    await cryptoWaitReady();
    await api.tx.balances
    .transfer( orderinfo.wallet, bob )
    .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
      if (status.isInBlock) {
        events.forEach( async ({ event: { method, data: [error] } }) => {
          if (conn == null) {
            conn = await MongoClient.connect(url, { useUnifiedTopology: true })
          }
          const search1 = conn.db("identifier").collection("VirtualInfo")
          if (error.isModule && method == 'ExtrinsicFailed') {
            await search1.updateOne({_id: id}, {$set:{orderStatus: 0, errRefund: true}})
            response.json({
              success: false,
              code: -3,
              msg: catchError.message + '创建待确认租用订单失败，退币失败，请联系客服处理',
              content: id
            })
            if (conn != null){
              conn.close()
              conn = null
            }
          }else if(method == 'ExtrinsicSuccess'){
            await search1.updateOne({_id: id}, {$set:{orderStatus: 0}})
            response.json({
              success: false,
              code: -2,
              msg: catchError.message + '创建待确认租用订单失败，DBC已退回原账户',
              content: id
            })
            if (conn != null){
              conn.close()
              conn = null
            }
          }
        });
      }
    })
  }
})

// 查询虚拟机订单 订单状态： 0：待支付 1：已支付，待租用 2：待确认租用 3：正在使用中 4：订单结束 5：订单取消 6.正在退币中，请稍后(只针对订单取消状态之前) errRefund：退币异常
rentVirtual.post('/getVirtual', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { wallet } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(wallet) {
      const search = conn.db("identifier").collection("VirtualInfo")
      let orderArr = await search.find({wallet: wallet, orderStatus: {$in:[2, 3, 4, 5, 6]}, searchHidden: {$ne: true}}).project({keyArr: 0}).sort({"createTime": -1}).toArray()
      response.json({
        success: true,
        code: 10001,
        msg: '查询订单成功',
        content: orderArr
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

// 确认租用
rentVirtual.post('/confirmRent', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, machine_id, rent_order } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id&&machine_id) {
      const search = conn.db("identifier").collection("VirtualInfo")
      const wallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await wallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      await GetApi()
      let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .confirmRent( rent_order )
      .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] }}) => {
            if (error.isModule && method == 'ExtrinsicFailed') {
              const decoded = await api.registry.findMetaError(error.asModule)
              response.json({
                success: false,
                code: -2,
                msg: decoded.method + '-->租用失败，请重试',
                content: id
              })
              if (conn != null){
                conn.close()
                conn = null
              }
            } else if(method == 'ExtrinsicSuccess') {
              if (conn == null) {
                conn = await MongoClient.connect(url, { useUnifiedTopology: true })
              }
              const search1 = conn.db("identifier").collection("VirtualInfo")
              await search1.updateOne({_id: id}, {$set:{orderStatus: 3}})
              response.json({
                success: true,
                code: 10001,
                msg: '租用成功，订单转为正在使用中',
                content: id
              })
              if (conn != null){
                conn.close()
                conn = null
              }
            }
          });
        }
      })
    }else{
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
    if (conn != null){
      conn.close()
      conn = null
    }
  }
})

// 续费
rentVirtual.post('/renewRent', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, add_day, dbc, wallet, rent_order } = request.body
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id&&add_day&&dbc) {
      const search = conn.db("identifier").collection("VirtualInfo")
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let orderArr = await search.find({_id: id}).toArray()
      let orderinfo = orderArr[0]
      await GetApi()
      let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .reletMachine( rent_order, Number(add_day)*2880 )
      .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] }}) => {
            if (error.isModule && method == 'ExtrinsicFailed') {
              const decoded = await api.registry.findMetaError(error.asModule)
              const siPower = new BN(15)
              const bob = inputToBn(String(dbc), siPower, 15)
              await cryptoWaitReady();
              await api.tx.balances
              .transfer( wallet, bob )
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
                    }else if(method == 'ExtrinsicSuccess'){
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
              })
            }else if(method == 'ExtrinsicSuccess'){
              if (conn == null) {
                conn = await MongoClient.connect(url, { useUnifiedTopology: true })
              }
              const search1 = conn.db("identifier").collection("VirtualInfo")
              await search1.updateOne({_id: id}, {$set:{ dbc: (orderinfo.dbc + dbc), day: (orderinfo.day + add_day)}})
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
            }
          });
        }
      })
    }else{
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
    if (conn != null){
      conn.close()
      conn = null
    }
  }
})

// 创建时查询机器的相关信息
rentVirtual.post('/getMachineInfo', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { machine_id, id } = request.body
    if(machine_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const search = conn.db("identifier").collection("virtualTask")
      let orderArr = await search.find({belong: {$regex: machine_id}}).project({_id: 0, ssh_port:1 ,rdp_port:1, vnc_port:1, port_max: 1, port_min: 1, status: 1, ssh_ip: 1, network_filters: 1}).toArray()
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
          content: {
            taskInfo: orderArr,
            info: VirInfo.message
          }
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
    if (conn != null){
      conn.close()
      conn = null
    }
  }
})

// 创建网络
rentVirtual.post('/createNetwork', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { machine_id, wallet, server_room, rent_order } = request.body
    if(machine_id&&wallet&&server_room) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const networkInfo = conn.db("identifier").collection("networkInfo")
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      const walletArr = await getwallet.find({_id: machine_id+wallet}).toArray()
      const walletinfo = walletArr[0]
      // let newsession;
      // const { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
      // try {
      //   newsession = await httpRequest({
      //     url: baseUrl + "/api/v1/mining_nodes/session_id",
      //     method: "post",
      //     json: true,
      //     headers: {},
      //     body: {
      //       "peer_nodes_list": [machine_id], 
      //       "additional": { },
      //       "nonce": nonce1,
      //       "sign": sign1,
      //       "wallet": walletinfo.wallet
      //     }
      //   })
      // } catch (err) {
      //   newsession = {
      //     message: err.message
      //   }
      // }
      // console.log(newsession, 'newsession');
      // let { nonce: nonce2, signature: sign2 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
      // console.log(nonce2, sign2, '33');
      // return
      let netArr = await networkInfo.find({ _id: (server_room + wallet) }).toArray()
      if (netArr.length) {
        const netInfo = netArr[0]
        let searchNet = {}
        const { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        try {
          searchNet = await httpRequest({
            url: baseUrl + `/api/v1/lan/${netInfo.network_name}`,
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": {},
              "nonce": nonce1,
              "sign": sign1,
              "wallet": walletinfo.wallet,
              "rent_order": String(rent_order)
            }
          })
        } catch (err) {
          searchNet = {
            message: err.message
          }
        }
        if (searchNet.errcode != undefined || searchNet.errcode != null) {
          searchNet = searchNet
        } else {
          if (searchNet.netcongtu || searchNet.mainnet) {
            if (machine_id.indexOf('CTC') != -1) {
              searchNet = searchNet.netcongtu
            } else {
              searchNet = searchNet.mainnet
            }
          } else {
            searchNet = searchNet
          }
        }
        if (searchNet&&searchNet.errcode == 0) {
          response.json({
            code: 10001,
            msg: '已存在网络名称',
            success: true,  
            content: netInfo.network_name
          })
        } else {
          await networkInfo.deleteOne({ _id: (server_room + wallet)})
          const { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
          const network_name = getnetwork();
          let VirInfo = {}
          try {
            VirInfo = await httpRequest({
              url: baseUrl + "/api/v1/lan/create",
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [machine_id], 
                "additional": {
                  "network_name": network_name,
                  "ip_cidr": "192.168.66.0/24"
                },
                "nonce": nonce1,
                "sign": sign1,
                "wallet": walletinfo.wallet,
                "rent_order": String(rent_order)
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
            await networkInfo.insertOne({ _id: (server_room + wallet), network_name: network_name })
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
      } else {
        const { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        const network_name = getnetwork();
        let VirInfo = {}
        try {
          VirInfo = await httpRequest({
            url: baseUrl + "/api/v1/lan/create",
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": {
                "network_name": network_name,
                "ip_cidr": "192.168.66.0/24"
              },
              "nonce": nonce1,
              "sign": sign1,
              "wallet": walletinfo.wallet,
              "rent_order": String(rent_order)
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
          await networkInfo.insertOne({ _id: (server_room + wallet), network_name: network_name })
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
      // if (orderinfo.network_name != null && orderinfo.network_name != '') {
      //   response.json({
      //     code: 10001,
      //     msg: '已存在网络名称',
      //     success: true,  
      //     content: orderinfo.network_name
      //   })
      // } else {
        
      //   let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
      //   let network_name = getnetwork();
      //   let VirInfo = {}
      //   try {
      //     VirInfo = await httpRequest({
      //       url: baseUrl + "/api/v1/lan/create",
      //       method: "post",
      //       json: true,
      //       headers: {},
      //       body: {
      //         "peer_nodes_list": [orderinfo.machine_id], 
      //         "additional": {
      //           "network_name": network_name,
      //           "ip_cidr": "192.168.66.0/24"
      //         },
      //         "nonce": nonce1,
      //         "sign": sign1,
      //         "wallet": walletinfo.wallet
      //       }
      //     })
      //   } catch (err) {
      //     VirInfo = {
      //       message: err.message
      //     }
      //   }
      //   if (VirInfo.errcode != undefined || VirInfo.errcode != null) {
      //     VirInfo = VirInfo
      //   } else {
      //     if (VirInfo.netcongtu || VirInfo.mainnet) {
      //       if (orderinfo.machine_id.indexOf('CTC') != -1) {
      //         VirInfo = VirInfo.netcongtu
      //       } else {
      //         VirInfo = VirInfo.mainnet
      //       }
      //     } else {
      //       VirInfo = VirInfo
      //     }
      //   }
      //   if (VirInfo&&VirInfo.errcode == 0) {
      //     await virtualInfo.updateOne({_id: id},{$set:{network_name: network_name}})
      //     response.json({
      //       code: 10001,
      //       msg: '获取网络名称成功',
      //       success: true,
      //       content: network_name
      //     })
      //   } else {
      //     response.json({
      //       code: -2,
      //       msg: VirInfo.message,
      //       success: false
      //     })
      //   }
      // }
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

// 查询机房ip
rentVirtual.post('/searchRoomIp', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { machine_id } = request.body
    if(machine_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getip = conn.db("identifier").collection("DataCenterIp");
      let ipArr = await getip.find({_id: machine_id}).project({_id: 0, hasip: 1}).toArray()
      response.json({
        code: 10001,
        msg:'获取成功',
        success: true,
        content: ipArr.length ? ipArr[0].hasip : []
      })
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

// 创建虚拟机
rentVirtual.post('/createVirTask', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { 
      id, 
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
      nonce, 
      sign, 
      wallet,
      // network_name,
      networkId,
      data_file_name,
      public_ip,
      network_sec,
      network_Id,
      network_filters,
      rent_order
    } = request.body
    if(id&&machine_id&&nonce&&sign&&wallet) {
      let hasNonce = await Verify(nonce, sign, wallet)
      if (hasNonce) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        const searchNonce = conn.db("identifier").collection("nonceList")
        let NonceInfo = await searchNonce.find({wallet: wallet, nonce: nonce, belong: 'rentvirtual'}).toArray()
        if (!NonceInfo.length) {
          await searchNonce.insertOne({ nonce: nonce, wallet: wallet, belong: 'rentvirtual' })
          const getwallet = conn.db("identifier").collection("temporaryWallet")
          const network = conn.db("identifier").collection("networkInfo")
          const networkArr = await network.find({_id: networkId}).toArray()
          const task = conn.db("identifier").collection("virtualTask")
          let walletArr = await getwallet.find({_id: id}).toArray()
          let walletinfo = walletArr[0]
          let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
          let VirInfo = {}
          const task_id = createTaskId()
          await task.insertOne({
            _id: task_id,
            belong: id,
            images: image_name,
            port_min: port_min,
            port_max: port_max,
            rdp_port: rdp_port,
            network_sec: network_sec,
            network_Id: network_Id,
            task_id: task_id
          })
          try {
            VirInfo = await httpRequest({
              url: baseUrl + "/api/v1/tasks/start",
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [machine_id], 
                "additional": {
                  "task_id": task_id,
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
                  "data_file_name": '',
                  "public_ip": String(public_ip),
                  "network_filters": network_filters,
                  "network_name": String(networkArr.length?networkArr[0].network_name:'')
                },
                "nonce": nonce1,
                "sign": sign1,
                "wallet": walletinfo.wallet,
                "rent_order": String(rent_order)
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
            const security = conn.db("identifier").collection("securityGroup")
            if (network_Id) {
              let SGarr = await security.find({_id: network_Id}).toArray()
              await security.updateOne({_id: network_Id}, {$set: {bindVM: SGarr[0].bindVM + 1}})
            }
            if (task_id == VirInfo.message.task_id) {
              await task.updateOne({ _id: VirInfo.message.task_id }, {$set: {...VirInfo.message}})
            } else {
              await task.deleteOne({_id: task_id})
              await task.insertOne({
                _id: VirInfo.message.task_id,
                belong: id,
                images: image_name,
                port_min: port_min,
                port_max: port_max,
                rdp_port: rdp_port,
                network_sec: network_sec,
                network_Id: network_Id,
                // multicast: JSON.parse(multicast),
                ...VirInfo.message
              })
            }
            response.json({
              code: 10001,
              msg: '创建中',
              success: true,
              content: VirInfo.message
            })
          } else {
            const virtualInfo = conn.db("identifier").collection("VirtualInfo")
            if (VirInfo.message == 'can not find network info') {
              await virtualInfo.updateOne({_id: id},{$set:{network_name: ''}})
              response.json({
                code: -4,
                msg: 'Creation failed, please try again later',
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

// 定时查询虚拟机
rentVirtual.post('/timedQueryTask', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { 
      id, 
      machine_id,
      task_id,
      rent_order
    } = request.body
    if(id&&machine_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getSession = conn.db("identifier").collection("sessionInfo");
      const virtask = conn.db("identifier").collection("virtualTask")
      let Session = await getSession.find({_id: id}).toArray()
      let taskArr = await virtask.find({ _id: task_id }).toArray()
      let taskArrInfo = taskArr[0]
      let VirInfo = {}
      if (Session.length) {
        try {
          VirInfo = await httpRequest({
            url: baseUrl + "/api/v1/tasks/"+ task_id,
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [machine_id], 
              "additional": {},
              "session_id": Session[0].session_id,
              "session_id_sign": Session[0].session_id_sign,
              "rent_order": String(rent_order)
            }
          })
        } catch (err) {
          VirInfo = {
            message: err.message
          }
        }
      } else {
        const getwallet = conn.db("identifier").collection("temporaryWallet")
        let walletArr = await getwallet.find({_id: id}).toArray()
        let walletinfo = walletArr[0]
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
              "rent_order": String(rent_order)
            }
          })
        } catch (err) {
          newsession = {
            message: err.message
          }
        }
        console.log(newsession, 'newsession');
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
          let { nonce: nonce1, signature: sign1 } = await CreateSignature1(walletinfo.seed, newsession.message.session_id)
          await getSession.insertOne({
            _id: id,
            session_id: nonce1,
            session_id_sign: sign1
          })
          try {
            VirInfo = await httpRequest({
              url: baseUrl + "/api/v1/tasks/"+ task_id,
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [machine_id], 
                "additional": {},
                "session_id": nonce1,
                "session_id_sign": sign1,
                "rent_order": String(rent_order)
              }
            })
          } catch (err) {
            VirInfo = {
              message: err.message
            }
          }
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
      console.log(VirInfo, 'VirInfo');
      if (VirInfo && VirInfo.errcode == 0) {
        await virtask.updateOne({ _id: task_id }, { $set: {...taskArrInfo, ...VirInfo.message} })
        let resultArr = await virtask.find({ _id: task_id }).toArray()
        response.json({
          code: 10001,
          msg:'获取成功',
          success: true,
          content: resultArr[0]
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

// 查看虚拟机 
rentVirtual.post('/getVirTask', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, nonce, sign, wallet, machine_id, rent_order } = request.body
    if(id&&nonce&&sign&&wallet) {
      let hasNonce = await Verify(nonce, sign, wallet)
      if (hasNonce) {
        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        const searchNonce = conn.db("identifier").collection("nonceList")
        let NonceInfo = await searchNonce.find({wallet: wallet, nonce: nonce, belong: 'rentvirtual' }).toArray()
        if (!NonceInfo.length) {
          await searchNonce.insertOne({ nonce: nonce, wallet: wallet, belong: 'rentvirtual' })
          const task = conn.db("identifier").collection("virtualTask")
          const getwallet = conn.db("identifier").collection("temporaryWallet")
          let taskArr = await task.find({ belong: id }).toArray()
          let walletArr = await getwallet.find({_id: id}).toArray()
          let walletinfo = walletArr[0]
          for (let k = 0; k < taskArr.length; k++) {
            let taskinfo = {}
            try {
              let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
              taskinfo = await httpRequest({
                url: baseUrl + "/api/v1/tasks/"+taskArr[k].task_id,
                method: "post",
                json: true,
                headers: {},
                body: {
                  "peer_nodes_list": [machine_id], 
                  "additional": {},
                  "nonce": nonce1,
                  "sign": sign1,
                  "wallet": walletinfo.wallet,
                  "rent_order": String(rent_order)
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
              await task.updateOne({ _id: taskArr[k].task_id }, { $set: taskinfo.message })
            } else if (taskinfo.message == 'task_id not exist') {
              await task.deleteOne({ _id: taskArr[k].task_id })
            }
          }
          let belongMachine = await task.find({ belong: id }).toArray()
          response.json({
            code: 10001,
            msg: '请求成功',
            success: true,
            content: belongMachine
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
rentVirtual.post('/restartVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, task_id, machine_id, rent_order } = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/restart/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet,
            "rent_order": String(rent_order)
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
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
})

// 删除虚拟机
rentVirtual.post('/deleteVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, task_id, machine_id, rent_order } = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      const virtualTask = conn.db("identifier").collection("virtualTask")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/delete/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet,
            "rent_order": String(rent_order)
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
        const virArr = await virtualTask.find({_id: task_id}).toArray()
        const virInfo = virArr[0]
        if (virInfo.network_Id) {
          const security = conn.db("identifier").collection("securityGroup")
          let SGarr = await security.find({_id: virInfo.network_Id}).toArray()
          await security.updateOne({_id: virInfo.network_Id}, {$set: {bindVM: SGarr[0].bindVM - 1}})
        }
        await virtualTask.deleteOne({_id: task_id})
        response.json({
          code: 10001,
          msg: '删除成功',
          success: true
        })
      } else if (taskinfo.message == 'task_id not exist') {
        const virArr = await virtualTask.find({_id: task_id}).toArray()
        const virInfo = virArr[0]
        if (virInfo.network_Id) {
          const security = conn.db("identifier").collection("securityGroup")
          let SGarr = await security.find({_id: virInfo.network_Id}).toArray()
          await security.updateOne({_id: virInfo.network_Id}, {$set: {bindVM: SGarr[0].bindVM - 1}})
        }
        await virtualTask.deleteOne({ _id: task_id })
        response.json({
          code: 10002,
          msg: '删除成功',
          success: true
        })
      } else {
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
rentVirtual.post('/stopVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, task_id, machine_id, rent_order } = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/poweroff/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet,
            "rent_order": String(rent_order)
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
rentVirtual.post('/startVir', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, task_id, machine_id, rent_order } = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/start/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet,
            "rent_order": String(rent_order)
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
          msg: '启动成功',
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
rentVirtual.post('/editVir', urlEcode, async (request, response ,next) => {
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
      new_public_ip,
      network_Id,
      network_sec,
      new_network_filters,
      rent_order} = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        let perams = {
          "new_ssh_port": String(new_ssh_port),
          "new_vnc_port": String(new_vnc_port),
          "new_rdp_port": String(new_rdp_port),
          "new_custom_port": [`tcp,${port_min}-${port_max}`,`udp,${port_min}-${port_max}`],
          "new_gpu_count": String(new_gpu_count),  // >= 0
          "new_cpu_cores": String(new_cpu_cores),  // > 0, 单位G
          "new_mem_size": String(new_mem_size),  // > 0, 单位G
          // "new_public_ip": new_public_ip , // 公网ip地址
          // "new_network_filters": new_network_filters // 安全组
        }
        if (new_public_ip) {
          perams.new_public_ip = new_public_ip
        }
        if (new_network_filters) {
          perams.new_network_filters = new_network_filters
        }
        // if (increase_disk_size) {
        //   perams.increase_disk_size = String(increase_disk_size)
        // }
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/modify/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": perams,
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet,
            "rent_order": String(rent_order)
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
        const virArr = await task.find({_id: task_id}).toArray()
        const virInfo = virArr[0]
        if (network_Id || network_Id == '') {
          const security = conn.db("identifier").collection("securityGroup")
          let SGarr1 = await security.find({_id: virInfo.network_Id}).toArray()
          if (SGarr1.length) {
            await security.updateOne({_id: virInfo.network_Id}, {$set: {bindVM: SGarr1[0].bindVM - 1}})
          }
          let SGarr = await security.find({_id: network_Id}).toArray()
          if (SGarr.length) {
            await security.updateOne({_id: network_Id}, {$set: {bindVM: SGarr[0].bindVM + 1}})
          }
          await task.updateOne({_id: task_id}, {$set:{
            port_min: port_min,
            port_max: port_max,
            rdp_port: new_rdp_port,
            network_Id: network_Id,
            network_sec: network_sec
          }})
        } else {
          await task.updateOne({_id: task_id}, {$set:{
            port_min: port_min,
            port_max: port_max,
            rdp_port: new_rdp_port
          }})
        }
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

// 修改密码
rentVirtual.post('/editpasswd', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { 
      id,
      task_id, 
      machine_id, 
      username, 
      password,
      rent_order
    } = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        let perams = {
          "username": String(username),
          "password": String(password)
        }
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/tasks/passwd/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": perams,
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet,
            "rent_order": String(rent_order)
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

// 修改磁盘
rentVirtual.post('/editDisk', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, task_id, machine_id, disk_name, disk_num } = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/disk/resize/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {
              "disk": String(disk_name),  //盘符
              "size": disk_num  //单位: G
            },
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet
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

// 添加数据盘
rentVirtual.post('/addDisk', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, task_id, machine_id, mount_dir, size } = request.body
    if(id&&task_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/disk/add/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {
              "mount_dir": String(mount_dir),  // 挂载目录，默认：/data
              "size": size//单位: G
            },
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet
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
          msg: '添加成功',
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

// 清楚机器内存
rentVirtual.post('/clearMem', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, machine_id, rent_order } = request.body
    if(id&&machine_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        taskinfo = await httpRequest({
          url: baseUrl + "/api/v1/mining_nodes/free_memory",
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet,
            "rent_order": String(rent_order)
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
          msg: '清理成功',
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



// 举报机器问题
rentVirtual.post('/reportErr', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, machine_id, errType, err_desc, wallet } = request.body
    if(id&&machine_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      const keyArr = naclBoxKeypairFromSecret(hexToU8a(walletinfo.seed))
      const randomWord = randomWord1()
      const ReportHash = blake2AsHex((machine_id + randomWord + err_desc), 128)
      try {
        let wallet_stake = await getStake(walletinfo.wallet)
        if (wallet_stake.staked_amount != 0) {
          await GetApi();
          let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
          const siPower = new BN(15)
          const bob = inputToBn('20000', siPower, 15)
          await cryptoWaitReady();
          await api.tx.maintainCommittee
          .reporterAddStake(bob)
          .signAndSend( accountFromKeyring ,( { events = [], status  } ) => {
            if (status.isInBlock) {
              events.forEach( async ({ event: { method, data: [error] } }) => {
                if (method == 'ExtrinsicFailed') {
                  let returnError = error
                  const decoded = api.registry.findMetaError(returnError.asModule);
                  response.json({
                    code: -3,
                    msg: decoded.method,
                    success: false
                  })
                }else if(method == 'ExtrinsicSuccess'){
                  let permas = {};
                  if (errType == 'RentedInaccessible') {
                    permas['RentedInaccessible'] = `${machine_id}`
                  } else {
                    permas[errType] = [ReportHash, u8aToHex(keyArr.publicKey)]
                  }
                  await GetApi();
                  let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
                  await cryptoWaitReady();
                  await api.tx.maintainCommittee
                  .reportMachineFault(permas)
                  .signAndSend( accountFromKeyring ,( { events = [], status  } ) => {
                    if (status.isInBlock) {
                      events.forEach( async ({ event: { method, data: [error] } }) => {
                        if (method == 'ExtrinsicFailed') {
                          let returnError = error
                          const decoded = api.registry.findMetaError(returnError.asModule);
                          response.json({
                            code: -3,
                            msg: decoded.method,
                            success: false
                          })
                        }else if(method == 'ExtrinsicSuccess'){
                          if (conn == null) {
                            conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                          }
                          const search = conn.db("identifier").collection("VirtualInfo")
                          await search.updateOne({_id: id}, {$set:{ reportErr: 'processing', ReportHash: ReportHash, ReportNonce: randomWord, err_desc: err_desc, errType: errType}})
                          response.json({
                            code: 10001,
                            msg: '举报成功',
                            success: true
                          })
                        }
                      });
                    }
                  })
                }
              });
            }
          })
        } else {
          let permas = {};
          if (errType == 'RentedInaccessible') {
            permas['RentedInaccessible'] = `${machine_id}`
          } else {
            permas[errType] = [ReportHash, u8aToHex(keyArr.publicKey)]
          }
          await GetApi();
          let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
          await cryptoWaitReady();
          await api.tx.maintainCommittee
          .reportMachineFault(permas)
          .signAndSend( accountFromKeyring ,( { events = [], status  } ) => {
            if (status.isInBlock) {
              events.forEach( async ({ event: { method, data: [error] } }) => {
                if (method == 'ExtrinsicFailed') {
                  let returnError = error
                  const decoded = api.registry.findMetaError(returnError.asModule);
                  response.json({
                    code: -3,
                    msg: decoded.method,
                    success: false
                  })
                }else if(method == 'ExtrinsicSuccess'){
                  if (conn == null) {
                    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                  }
                  const search = conn.db("identifier").collection("VirtualInfo")
                  await search.updateOne({_id: id}, {$set:{ reportErr: 'processing', ReportHash: ReportHash, ReportNonce: randomWord, err_desc: err_desc, errType: errType}})
                  response.json({
                    code: 10001,
                    msg: '举报成功',
                    success: true
                  })
                }
              });
            }
          })
        }
      } catch (err) {
        response.json({
          code: -2,
          msg: err.message,
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

// 取消举报
rentVirtual.post('/reportCancel', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, machine_id, report_id } = request.body
    if(id&&machine_id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      try {
        await GetApi();
        let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
        await cryptoWaitReady();
        await api.tx.maintainCommittee
        .reporterCancelReport(report_id)
        .signAndSend( accountFromKeyring ,( { events = [], status  } ) => {
          if (status.isInBlock) {
            events.forEach( async ({ event: { method, data: [error] } }) => {
              if (method == 'ExtrinsicFailed') {
                let returnError = error
                const decoded = api.registry.findMetaError(returnError.asModule);
                response.json({
                  code: -3,
                  msg: decoded.method,
                  success: false
                })
              } else if(method == 'ExtrinsicSuccess'){
                if (conn == null) {
                  conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                }
                const search = conn.db("identifier").collection("VirtualInfo")
                await search.updateOne({_id: id}, {$set:{ reportErr: 'cancal-unstake' }})
                const wallet_stake = await getStake(walletinfo.wallet)
                const refundCoin = (wallet_stake.staked_amount*0.6 - wallet_stake.used_stake)/0.6
                const siPower = new BN(15)
                const bob = inputToBn(String(refundCoin), siPower, 15)
                await api.tx.maintainCommittee
                .reporterReduceStake( bob )
                .signAndSend( accountFromKeyring , async ( { events = [], status , dispatchError  } ) => {
                  if (conn == null) {
                    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                  }
                  const search = conn.db("identifier").collection("VirtualInfo")
                  if (status.isInBlock) {
                    events.forEach( async ({ event: { method, data: [error] } }) => {
                      if (error.isModule && method == 'ExtrinsicFailed') {
                        await search.updateOne({_id: id}, {$set:{ reportErr: 'cancal-unstake-fail' }})
                        response.json({
                          code: 10001,
                          msg: '取消成功，解除质押DBC失败',
                          content: 'unstake-fail',
                          success: true
                        })
                      }else if(method == 'ExtrinsicSuccess'){
                        await search.updateOne({_id: id}, {$set:{ reportErr: 'cancal-unstake-success' }})
                        response.json({
                          code: 10001,
                          msg: '取消成功，解除质押DBC成功',
                          content: 'unstake-success',
                          success: true
                        })
                      }
                    });
                  }
                })
              }
            });
          }
        })
      } catch (err) {
        response.json({
          code: -2,
          msg: err.message,
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
    if (conn != null) {
      conn.close()
      conn = null
    }
  }
})

// 举报30分钟内提交加密信息
rentVirtual.post('/reportSubmitMsg', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, machine_id, report_id, toWallet, toPub } = request.body
    if(id&&report_id&&toWallet) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      const Vir = conn.db("identifier").collection("VirtualInfo")
      const session = conn.db("identifier").collection("sessionInfo")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let VirArr = await Vir.find({_id: id}).toArray()
      let virInfo = VirArr[0]
      let sessArr = await session.find({_id: id}).toArray()
      let sessInfo = sessArr[0]
      // 加密需要给用户的信息，赋值给 encrypted_err_info，需要提供  machine_id + 报告人随机字符串 + 错误信息
      let perams = {
        machine_id: machine_id,
        err_reason: virInfo.err_desc,
        session_id: sessInfo ? sessInfo.session_id : 'undefined',
        session_id_sign: sessInfo ? sessInfo.session_id_sign : 'undefined',
        report_rand_str: virInfo.ReportNonce
      }
      let message = stringToU8a(JSON.stringify(perams));
      const keyArr = naclBoxKeypairFromSecret(hexToU8a(walletinfo.seed))
      let nonce = hexToU8a('0x8d842da497f095e0d0afb969e3a7cb51e77d76dc97343dfc')
      const str_Sealed = naclSeal( message, keyArr.secretKey, hexToU8a(toPub), nonce ); 
      try {
        await GetApi();
        let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
        await cryptoWaitReady();
        await api.tx.maintainCommittee
        .reporterAddEncryptedErrorInfo(report_id, toWallet, str_Sealed.sealed)
        .signAndSend( accountFromKeyring ,( { events = [], status  } ) => {
          if (status.isInBlock) {
            events.forEach( async ({ event: { method, data: [error] } }) => {
              if (method == 'ExtrinsicFailed') {
                let returnError = error
                const decoded = api.registry.findMetaError(returnError.asModule);
                response.json({
                  code: -3,
                  msg: decoded.method,
                  success: false
                })
              }else if(method == 'ExtrinsicSuccess'){
                if (conn == null) {
                  conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                }
                response.json({
                  code: 10001,
                  msg: '发动成功',
                  success: true
                })
              }
            });
          }
        })
      } catch (err) {
        response.json({
          code: -2,
          msg: err.message,
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

// 举报订单以处理完毕 或 处于惩罚中
rentVirtual.post('/reportFinish', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, status } = request.body
    if(id) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const search = conn.db("identifier").collection("VirtualInfo")
      if (status == 'error') {
        await search.updateOne({_id: id}, {$set:{ reportErr: 'ending-punish'}})
      } else if (status == 'end') {
        await search.updateOne({_id: id}, {$set:{ reportErr: 'ending-over' }})
      } else {
        await search.updateOne({_id: id}, {$set:{ reportErr: 'ending-over' }})
      }
      response.json({
        code: 10001,
        msg: '修改状态成功',
        success: true
      })
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
    if (conn != null) {
      conn.close()
      conn = null
    }
  }
})

// 举报退币
rentVirtual.post('/reportRefund', urlEcode, async (request, response ,next) => {
  let conn = null;
  try {
    const { id, wallet } = request.body
    if (id&&wallet) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      const siPower = new BN(15)
      const bob = inputToBn('20000', siPower, 15)
      await GetApi();
      let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.balances
      .transfer( wallet, bob )
      .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] } }) => {
            if (error.isModule && method == 'ExtrinsicFailed') {
              response.json({
                success: false,
                code: -3,
                msg: 'DBC退币失败，请联系客服处理',
                content: id
              })
              if (conn != null){
                conn.close()
                conn = null
              }
            }else if(method == 'ExtrinsicSuccess'){
              if (conn == null) {
                conn = await MongoClient.connect(url, { useUnifiedTopology: true })
              }
              const search = conn.db("identifier").collection("VirtualInfo")
              await search.updateOne({_id: id}, {$set:{ reportErr: 'cancal-success' }})
              response.json({
                success: true,
                code: 10001,
                msg: 'DBC已退回原账户',
                content: id
              })
              if (conn != null){
                conn.close()
                conn = null
              }
            }
          });
        }
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
    if (conn != null) {
      conn.close()
      conn = null
    }
  }
})