import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import httpRequest from 'request-promise';
import { typeJson, wssChain, mongoUrlSeed, baseUrl, designatedWallet } from '../publicResource.js'
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { BN_TEN } from '@polkadot/util';
import BN from 'bn.js'
import { decryptByAes256 } from '../testScript/crypto.js'
const mongoUrl = decryptByAes256(mongoUrlSeed)
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
let api  = null
let conn = null
// 链上交互
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
const keyring = new Keyring({type: 'sr25519'})
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

/**
 * machinesInfo 查询钱包的余额
 * @param permas
 */
 export const getbalance = async (wallet) => {
  await GetApi()
  const data = await api.query.system.account(wallet)
  const balance = data.toJSON();
  return balance.data.free / Math.pow(10, 15)
}

const checkVirtualStatus = async () => {
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const OrderInfo = conn.db("identifier").collection("virOrderInfo")
    const MacInfo = conn.db("identifier").collection("MachineDetailsInfo")
    const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
    let orderArr1 = await OrderInfo.find({orderStatus: 2}).toArray() // 查询订单中处于创建中或者未创建的订单
    let orderArr2 = await OrderInfo.find({orderStatus: 3}).toArray() // 查询订单中正在使用中的订单
    let orderArr3 = await OrderInfo.find({orderStatus: 5}).toArray() // 订单由于无法创建虚拟机取消(如果CanUseGpu等于机器的原始数目，hasSignle变为false,此时需要等15分钟才会开始退币)
    let orderArr4 = await OrderInfo.find({errRefund: true}).toArray() // 查询退币失败的订单
    let orderArr5 = await OrderInfo.find({orderStatus: 6}).toArray() // 查询订单中处于重新租用但未创建的订单
    for (let i = 0; i < orderArr1.length; i++) {
      if (orderArr1[i].createTime + 15*60*1000 < Date.now()) {
        await OrderInfo.updateOne({_id: orderArr1[i]._id}, {$set:{orderStatus: 5, status: 'closed'}})
      }
    }
    for (let i = 0; i < orderArr5.length; i++) {
      if (orderArr5[i].createTime + 15*60*1000 < Date.now()) {
        await OrderInfo.updateOne({_id: orderArr5[i]._id}, {$set:{orderStatus: 5, status: 'closed'}})
      }
    }
    for (let i = 0; i < orderArr2.length; i++) {
      if (orderArr2[i].createTime + orderArr2[i].time*60*60*1000 < Date.now()) {
        const MacArr = await MacInfo.find({_id: orderArr2[i].machine_id}).toArray()
        const MacArrInfo = MacArr[0]
        await MacInfo.updateOne({_id: orderArr2[i].machine_id}, {$set:{CanUseGpu: Number(MacArrInfo.CanUseGpu) + Number(orderArr2[i].gpu_count)}})
        if (Number(MacArrInfo.CanUseGpu) + Number(orderArr2[i].gpu_count) == MacArrInfo.gpu_num) {
          await MacInfo.updateOne({_id: orderArr2[i].machine_id}, {$set:{ hasSignle: false}})
        }
        if (orderArr2[i].status == 'running') {
          let taskinfo = {}
          try {
            taskinfo = await httpRequest({
              url: baseUrl + "/api/v1/tasks/stop/"+orderArr2[i].task_id,
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [orderArr2[i].machine_id], 
                "additional": {},
                "session_id": orderArr2[i].session_id,
                "session_id_sign": orderArr2[i].session_id_sign
              }
            })
          } catch (err) {
            taskinfo = {
              message: err.message
            }
          }
        }
        await OrderInfo.updateOne({_id: orderArr2[i]._id}, {$set:{orderStatus: 4, status: 'closed', session_id: '', session_id_sign: '', OrderId: '', confirmRent: false}})
      }
    }
    for (let i = 0; i < orderArr3.length; i++) { // processed: ture 退币已处理
      if ((orderArr3[i].createTime + 172800000) < Date.now() && !(orderArr3[i].searchHidden)) {
        await OrderInfo.updateOne({_id: orderArr3[i]._id}, {$set:{ searchHidden: true }})
      }
      if (orderArr3[i].createTime + 15*60*1000 < Date.now()) {
        if (!orderArr3[i].processed) {
          await GetApi()
          const walletArr = await wallet.find({_id: orderArr3[i].machine_id+orderArr3[i].account}).toArray()
          const walletinfo = walletArr[0]
          let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
          const siPower = new BN(15)
          const bob = inputToBn(String(orderArr3[i].dbc-21), siPower, 15)
          await cryptoWaitReady();
          await api.tx.balances
          .transfer( orderArr3[i].account, bob )
          .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
            if (status.isInBlock) {
              events.forEach( async ({ event: { method, data: [error] } }) => {
                if (method == 'ExtrinsicSuccess') {
                  if (conn == null) {
                    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                  }
                  const Info1 = conn.db("identifier").collection("virOrderInfo")
                  const MacInfo1 = conn.db("identifier").collection("MachineDetailsInfo")
                  const MacArr = await MacInfo1.find({_id: orderArr3[i].machine_id}).toArray()
                  const MacArrInfo = MacArr[0]
                  await Info1.updateOne({_id: orderArr3[i]._id}, {$set:{ processed: true }})
                  await MacInfo1.updateOne({_id: orderArr3[i].machine_id}, {$set:{CanUseGpu: Number(MacArrInfo.CanUseGpu) + Number(orderArr3[i].gpu_count)}})
                  if (Number(MacArrInfo.CanUseGpu) + Number(orderArr3[i].gpu_count) == MacArrInfo.gpu_num) {
                    await MacInfo1.updateOne({_id: orderArr3[i].machine_id}, {$set:{ hasSignle: false}})
                  }
                  if (conn != null) {
                    conn.close()
                    conn = null
                  }
                }
              });
            }
          })
        }
      }
    }
    for (let i = 0; i < orderArr4.length; i++) { // processed: ture 退币已处理
      if (errRefund && !processed) {
        await GetApi()
        const walletArr = await wallet.find({_id: orderArr4[i].machine_id+orderArr4[i].account}).toArray()
        const walletinfo = walletArr[0]
        let accountFromKeyring = keyring.addFromUri(walletinfo.seed);
        const siPower = new BN(15)
        const bob = inputToBn(String(orderArr4[i].dbc-11), siPower, 15)
        await cryptoWaitReady();
        await api.tx.balances
        .transfer( orderArr4[i].account, bob )
        .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
          if (status.isInBlock) {
            events.forEach( async ({ event: { method, data: [error] } }) => {
              if (method == 'ExtrinsicSuccess') {
                if (conn == null) {
                  conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                }
                const Info1 = conn.db("identifier").collection("virOrderInfo")
                await Info1.updateOne({_id: orderArr4[i]._id}, {$set:{ processed: true }})
                if (conn != null) {
                  conn.close()
                  conn = null
                }
              }
            });
          }
        })
      }
    }
  } catch (err) {
    console.log(err, 'checkVirtualStatus')
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
}

checkVirtualStatus();

export const scheduleCronstyle = () => {
  schedule.scheduleJob('30 * * * * *',function(){
    checkVirtualStatus();
  });
}

scheduleCronstyle();