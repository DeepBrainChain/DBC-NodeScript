import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import httpRequest from 'request-promise';
import { typeJson, wssChain, mongoUrlSeed, baseUrl, designatedWallet } from '../publicResource.js'
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { BN_TEN } from '@polkadot/util';
import BN from 'bn.js'
import { decryptByAes256 } from '../testscript/crypto.js'
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
    const MacInfo = conn.db("identifier").collection("virMachineInfo")
    const wallet = conn.db("identifier").collection("SignleTemporaryWallet")
    let orderArr1 = await OrderInfo.find({orderStatus: 3}).toArray() // 查询订单中正在使用中的订单
    let orderArr2 = await OrderInfo.find({orderStatus: 5}).toArray() // 查询订单中已结束但虚拟机未停止的订单
    let orderArr3 = await OrderInfo.find({orderStatus: {$in:[4, 6]}}).toArray() // 查询订单中创建和转账失败的订单
    for(let i = 0; i < orderArr1.length; i++){
      if (orderArr1[i].startTime + orderArr1[i].time*60*60*1000 < Date.now()) {
        await OrderInfo.updateOne({_id: orderArr1[i]._id}, {$set:{orderStatus: 5}})
        const MacArr = await MacInfo.find({_id: orderArr1[i].belong}).toArray()
        const MacArrInfo = MacArr[0]
        let taskinfo = {}
        try {
          taskinfo = await httpRequest({
            url: baseUrl + "/api/v1/tasks/stop/"+orderArr1[i].task_id,
            method: "post",
            json: true,
            headers: {},
            body: {
              "peer_nodes_list": [orderArr1[i].belong], 
              "additional": {},
              "session_id": MacArrInfo.session_id,
              "session_id_sign": MacArrInfo.session_id_sign
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
          if (orderArr1[i].belong.indexOf('CTC') != -1) {
            taskinfo = taskinfo.netcongtu
          } else {
            taskinfo = taskinfo.mainnet
          }
        }
        if (taskinfo&&taskinfo.errcode == 0) {
          await OrderInfo.updateOne({_id: orderArr1[i]._id}, {$set:{status: 'closed'}})
          await MacInfo.updateOne({_id: orderArr1[i].belong}, {$set:{canuseGpu: MacArrInfo.canuseGpu + orderArr1[i].gpu_count}})
        }
      }
    }
    for(let i = 0; i < orderArr2.length; i++){
      if (orderArr2[i].startTime + orderArr2[i].time*60*60*1000 < Date.now()) {
        if (orderArr2[i].status == 'running') {
          const MacArr = await MacInfo.find({_id: orderArr2[i].belong}).toArray()
          const MacArrInfo = MacArr[0]
          let taskinfo = {}
          try {
            taskinfo = await httpRequest({
              url: baseUrl + "/api/v1/tasks/stop/"+orderArr2[i].task_id,
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [orderArr2[i].belong], 
                "additional": {},
                "session_id": MacArrInfo.session_id,
                "session_id_sign": MacArrInfo.session_id_sign
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
            if (orderArr2[i].belong.indexOf('CTC') != -1) {
              taskinfo = taskinfo.netcongtu
            } else {
              taskinfo = taskinfo.mainnet
            }
          }
          if (taskinfo&&taskinfo.errcode == 0) {
            await OrderInfo.updateOne({_id: orderArr2[i]._id}, {$set:{status: 'closed'}})
            await MacInfo.updateOne({_id: orderArr2[i].belong}, {$set:{canuseGpu: MacArrInfo.canuseGpu + orderArr2[i].gpu_count}})
          }
        }
      }
    }
    for(let i = 0; i < orderArr3.length; i++){
      if ((orderArr3[i].ErrorTime + 172800000) < Date.now() && !(orderArr3[i].searchHidden)) {
        await OrderInfo.updateOne({_id: orderArr3[i]._id}, {$set:{ searchHidden: true }})
      }
      if (orderArr3[i].orderStatus  == 4) {
        if (orderArr3[i].status == 'running') {
          const MacArr = await MacInfo.find({_id: orderArr3[i].belong}).toArray()
          const MacArrInfo = MacArr[0]
          let taskinfo = {}
          try {
            taskinfo = await httpRequest({
              url: baseUrl + "/api/v1/tasks/stop/"+orderArr3[i].task_id,
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [orderArr3[i].belong], 
                "additional": {},
                "session_id": MacArrInfo.session_id,
                "session_id_sign": MacArrInfo.session_id_sign
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
            if (orderArr3[i].belong.indexOf('CTC') != -1) {
              taskinfo = taskinfo.netcongtu
            } else {
              taskinfo = taskinfo.mainnet
            }
          }
          if (taskinfo&&taskinfo.errcode == 0) {
            await OrderInfo.updateOne({_id: orderArr3[i]._id}, {$set:{status: 'closed'}})
            // await MacInfo.updateOne({_id: orderArr3[i].belong}, {$set:{canuseGpu: MacArrInfo.canuseGpu + orderArr3[i].gpu_count}})
          }
        }
      }
      if (orderArr3[i].orderStatus  == 6) {
        if (orderArr3[i].status == "create error" && !(orderArr3[i].processed)) {
          const MacArr = await MacInfo.find({_id: orderArr3[i].belong}).toArray()
          const MacArrInfo = MacArr[0]
          await OrderInfo.updateOne({_id: orderArr3[i]._id}, {$set:{ processed: true }})
          await MacInfo.updateOne({_id: orderArr3[i].belong}, {$set:{canuseGpu: MacArrInfo.canuseGpu + orderArr3[i].gpu_count}})
        }
        if (!(orderArr3[i].Refunded)) {
          await GetApi()
          let walletArr = await wallet.find({_id: orderArr3[i].belong+orderArr3[i].account}).toArray()
          let walletinfo = walletArr[0]
          let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
          const siPower = new BN(15)
          const bob = inputToBn(String(orderArr3[i].dbc-1), siPower, 15)
          await cryptoWaitReady();
          await api.tx.balances
          .transfer( orderArr3[i].account, bob )
          .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
            if (status.isInBlock) {
              events.forEach( async ({ event: { method, data: [error] } }) => {
                if(method == 'ExtrinsicSuccess'){
                  let Info1 = null
                  // let virInfo1 = null
                  if (conn == null) {
                    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                    Info1 = conn.db("identifier").collection("virOrderInfo")
                  }
                  await Info1.updateOne({_id: orderArr3[i]._id}, {$set:{ Refunded: true }})
                  if (conn != null){
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