import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { typeJson, wssChain, mongoUrl } from '../publicResource.js'
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
    // console.log('[modString]->', modString)
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
// 生成临时钱包四位随机数
rentVirtual.post('/getWallet', urlEcode, async (request, response ,next) => {
  try {
    let id = request.body.id
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
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
  }
})

// 生成虚拟机订单 订单状态： 0：待支付 1：已支付，待租用 2：待确认租用 3：正在使用中 4：订单结束 5：订单取消 errRefund：退币异常
rentVirtual.post('/createVirOrder', urlEcode, async (request, response ,next) => {
  try {
    const {id, machine_id, dollar, day, count, dbc, wallet } = request.body
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id&&machine_id&&dollar&&day&&count&&dbc&&wallet) {
      const test = conn.db("identifier").collection("MachineDetailsInfo")
      const search = conn.db("identifier").collection("VirtualInfo")
      let arr = await test.find({_id: machine_id}).toArray()
      let arrinfo = arr[0]
      if (arr.length) {
        let errRefund = false
        let orderStatus = 0
        let createTime = 0
        let searchOrder = await search.find({_id: id, orderStatus: {$in:[0, 4, 5]}}).toArray()
        if (searchOrder.length) {
          errRefund = searchOrder[0].errRefund ? searchOrder[0].errRefund : false
          orderStatus = searchOrder[0].orderStatus ? searchOrder[0].orderStatus : 0
          createTime = searchOrder[0].createTime ? searchOrder[0].createTime : 0
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
          orderStatus,
          createTime,
          errRefund
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
          msg:'获取机器信息失败',
          success: false
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
  }
})

// 支付完成，修改状态，租用机器 订单状态： 0：待支付 1：已支付，待租用 2：待确认租用 3：正在使用中 4：订单结束 5：订单取消 errRefund：退币异常
rentVirtual.post('/rentmachine', urlEcode, async (request, response ,next) => {
  try {
    const { id } = request.body
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id) {
      const search = conn.db("identifier").collection("VirtualInfo")
      const wallet = conn.db("identifier").collection("temporaryWallet")
      await search.updateOne({_id: id}, {$set:{orderStatus: 1}})
      let orderArr = await search.find({_id: id}).toArray()
      let orderinfo = orderArr[0]
      let walletArr = await wallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      await GetApi()
      let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .rentMachine( orderinfo.machine_id, orderinfo.day )
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
                    if (error.isModule && method == 'ExtrinsicFailed') {
                      await search.updateOne({_id: id}, {$set:{orderStatus: 0, errRefund: true}})
                      response.json({
                        success: false,
                        code: -3,
                        msg: decoded.method + '创建待确认租用订单失败，退币失败，请联系客服处理',
                        content: id
                      })
                    }else if(method == 'ExtrinsicSuccess'){
                      await search.updateOne({_id: id}, {$set:{orderStatus: 0}})
                      response.json({
                        success: false,
                        code: -2,
                        msg: decoded.method + '创建待确认租用订单失败，DBC已退回原账户',
                        content: id
                      })
                    }
                  });
                }
              })
            }else if(method == 'ExtrinsicSuccess'){
              await search.updateOne({_id: id}, {$set:{orderStatus: 2, createTime: Date.now()}})
              response.json({
                success: true,
                code: 10001,
                msg: '创建待确认租用订单成功',
                content: id
              })
            }
          });
        }
      })
    }else{
      await search.updateOne({_id: id}, {$set:{orderStatus: 0, errRefund: true}})
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
  }
})

// 查询虚拟机订单
rentVirtual.post('/getVirtual', urlEcode, async (request, response ,next) => {
  try {
    const { wallet } = request.body
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(wallet) {
      const search = conn.db("identifier").collection("VirtualInfo")
      let orderArr = await search.find({wallet: wallet, orderStatus: {$in:[2, 3, 4, 5]}}).toArray()
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
  }
})

// 确认租用
rentVirtual.post('/confirmRent', urlEcode, async (request, response ,next) => {
  try {
    const { id, machine_id } = request.body
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id&&machine_id) {
      const search = conn.db("identifier").collection("VirtualInfo")
      const wallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await wallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      await GetApi()
      let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
      await cryptoWaitReady();
      await api.tx.rentMachine
      .confirmRent( machine_id )
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
            }else if(method == 'ExtrinsicSuccess'){
              await search.updateOne({_id: id}, {$set:{orderStatus: 3}})
              response.json({
                success: true,
                code: 10001,
                msg: '租用成功，订单转为正在使用中',
                content: id
              })
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
    }
  } catch (error) {
    response.json({
      code: -10001,
      msg:error.message,
      success: false
    })
  }
})

// 续费
rentVirtual.post('/renewRent', urlEcode, async (request, response ,next) => {
  try {
    const { id, machine_id, add_day, dbc, wallet } = request.body
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(id&&machine_id&&add_day&&dbc) {
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
      .reletMachine( machine_id, add_day )
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
                    }else if(method == 'ExtrinsicSuccess'){
                      response.json({
                        success: false,
                        code: -2,
                        msg: decoded.method + '-->续费失败，DBC已退回原账户',
                        content: id
                      })
                    }
                  });
                }
              })
            }else if(method == 'ExtrinsicSuccess'){
              await search.updateOne({_id: id}, {$set:{ dbc: (orderinfo.dbc + dbc), day: (orderinfo.day + add_day)}})
              response.json({
                success: true,
                code: 10001,
                msg: '续费成功',
                content: id
              })
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
    }
  } catch (error) {
    response.json({
      code: -10001,
      msg:error.message,
      success: false
    })
  }
})

// 创建虚拟机
rentVirtual.post('/createVirTask', urlEcode, async (request, response ,next) => {
  try {
    const { id, machine_id, ssh_port, gpu_count, cpu_cores, mem_rate, disk_size, vnc_port, nonce, sign, wallet } = request.body
    if(id&&machine_id&&nonce&&sign&&wallet) {
      let hasNonce = await Verify(nonce, sign, wallet)
      if (hasNonce) {
        let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        const searchNonce = conn.db("identifier").collection("nonceList")
        let NonceInfo = await searchNonce.find({wallet: wallet, nonce: nonce}).toArray()
        if (!NonceInfo.length) {
          await searchNonce.insertOne({ nonce: nonce, wallet: wallet })
          const getwallet = conn.db("identifier").collection("temporaryWallet")
          let walletArr = await getwallet.find({_id: id}).toArray()
          let walletinfo = walletArr[0]
          let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
          let VirInfo = {}
          try {
            VirInfo = await httpRequest({
              url: "http://121.57.95.175:5179/api/v1/tasks/start",
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [machine_id], 
                "additional": {
                  "ssh_port": String(ssh_port),
                  "image_name": "ubuntu.qcow2",
                  "gpu_count": String(gpu_count),
                  "cpu_cores": String(cpu_cores),
                  "mem_size": String(mem_rate),
                  "disk_size": String(disk_size),
                  "vnc_port": String(vnc_port),
                  "vm_xml": "",
                  "vm_xml_url": ""
                },
                "nonce": nonce1,
                "sign": sign1,
                "wallet": walletinfo.wallet
              }
            })
          } catch (err) {
            VirInfo = err.error
          }
          if (VirInfo.errcode == 0) {
            const task = conn.db("identifier").collection("virtualTask")
            await task.insertOne({
              _id: VirInfo.message.task_id,
              belong: id,
              ...VirInfo.message
            })
            response.json({
              code: 10001,
              msg: '创建中',
              success: true
            })
          } else {
            response.json({
              code: -4,
              msg: VirInfo.message,
              success: false
            })
          }
          console.log(VirInfo, 'VirInfo')
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
  }
})

// 查看虚拟机 
rentVirtual.post('/getVirTask', urlEcode, async (request, response ,next) => {
  try {
    const { id, nonce, sign, wallet, machine_id } = request.body
    if(id&&nonce&&sign&&wallet) {
      let hasNonce = await Verify(nonce, sign, wallet)
      if (hasNonce) {
        let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
        const searchNonce = conn.db("identifier").collection("nonceList")
        let NonceInfo = await searchNonce.find({wallet: wallet, nonce: nonce}).toArray()
        if (!NonceInfo.length) {
          await searchNonce.insertOne({ nonce: nonce, wallet: wallet })
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
                url: "http://121.57.95.175:5179/api/v1/tasks/"+taskArr[k].task_id,
                method: "post",
                json: true,
                headers: {},
                body: {
                  "peer_nodes_list": [machine_id], 
                  "additional": {},
                  "nonce": nonce1,
                  "sign": sign1,
                  "wallet": walletinfo.wallet
                }
              })
            } catch (err) {
              taskinfo = err.error
            }
            if (taskinfo.errcode == 0) {
              await task.updateOne({ _id: taskArr[k].task_id }, { $set: taskinfo.message })
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
  }
})

// 重启虚拟机
rentVirtual.post('/restartVir', urlEcode, async (request, response ,next) => {
  try {
    const { id, task_id, machine_id } = request.body
    if(id&&task_id) {
      let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const getwallet = conn.db("identifier").collection("temporaryWallet")
      let walletArr = await getwallet.find({_id: id}).toArray()
      let walletinfo = walletArr[0]
      let taskinfo = {}
      try {
        let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletinfo.seed)
        taskinfo = await httpRequest({
          url: "http://121.57.95.175:5179/api/v1/tasks/restart/"+task_id,
          method: "post",
          json: true,
          headers: {},
          body: {
            "peer_nodes_list": [machine_id], 
            "additional": {},
            "nonce": nonce1,
            "sign": sign1,
            "wallet": walletinfo.wallet
          }
        })
      } catch (err) {
        taskinfo = err.error
      }
      console.log(taskinfo, 'restartVir')
      if (taskinfo.errcode == 0) {
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