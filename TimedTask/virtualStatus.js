import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import { typeJson, wssChain, mongoUrl } from '../publicResource.js'
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { BN_TEN } from '@polkadot/util';
import BN from 'bn.js'
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
 * machinesInfo 根据机器id查询机器状态 Online Creating Rented
 * @param permas
 */
 export const machinesInfo = async (machineId) => {
  await GetApi()
  const info = await api.query.onlineProfile.machinesInfo(machineId)
  return info.toHuman()
}

const checkVirtualStatus = async () => {
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const Info = conn.db("identifier").collection("VirtualInfo")
    const wallet = conn.db("identifier").collection("temporaryWallet")
    const virInfo = conn.db("identifier").collection("virtualTask")
    let orderArr1 = await Info.find({orderStatus: 2}).toArray() // 查询订单中待确认租用的订单
    let orderArr2 = await Info.find({orderStatus: 3}).toArray() // 查询订单中正在使用中的订单
    let orderArr3 = await Info.find({orderStatus: 4}).toArray() // 查询订单中结束的订单
    let orderArr4 = await Info.find({orderStatus: 6}).toArray() // 查询订单中正在退币的订单
    for(let i = 0; i < orderArr1.length; i++){
      if (orderArr1[i].createTime + 30*60*1000 < Date.now()) {
        await Info.updateOne({_id: orderArr1[i]._id}, {$set:{orderStatus: 6}})
        await GetApi()
        let walletArr = await wallet.find({_id: orderArr1[i]._id}).toArray()
        let walletinfo = walletArr[0]
        let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
        const siPower = new BN(15)
        const bob = inputToBn(String(orderArr1[i].dbc-10), siPower, 15)
        await cryptoWaitReady();
        await api.tx.balances
        .transfer( orderArr1[i].wallet, bob )
        .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
          if (status.isInBlock) {
            events.forEach( async ({ event: { method, data: [error] } }) => {
              console.log(method, 'orderStatus: 2');
              if(method == 'ExtrinsicSuccess'){
                await virInfo.deleteMany({ belong: orderArr1[i]._id })
                await Info.updateOne({_id: orderArr1[i]._id}, {$set:{orderStatus: 5}}) // 订单取消
              }
            });
          }
        })
      }
    }
    for(let i = 0; i < orderArr2.length; i++){
      if (orderArr2[i].createTime + orderArr2[i].day*24*60*60*1000 < Date.now()) {
        // let info = await machinesInfo(orderArr2[i].machine_id)
        // if (Object.keys(info.machine_status)[0] == 'Online') {
          await Info.updateOne({_id: orderArr2[i]._id}, {$set:{orderStatus: 4}}) // 订单结束
        // }
      }
    }
    for(let i = 0; i < orderArr3.length; i++){
      if ((orderArr3[i].createTime + orderArr3[i].day*24*60*60*1000 + 864000000) < Date.now()) {
        await virInfo.deleteMany({ belong: orderArr3[i]._id })
      }
    }
    for(let i = 0; i < orderArr4.length; i++){
      await GetApi()
      let walletArr = await wallet.find({_id: orderArr4[i]._id}).toArray()
      let walletinfo = walletArr[0]
      let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
      const siPower = new BN(15)
      const bob = inputToBn(String(orderArr4[i].dbc-10), siPower, 15)
      await cryptoWaitReady();
      await api.tx.balances
      .transfer( orderArr4[i].wallet, bob )
      .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] } }) => {
            console.log(method, 'orderStatus: 6');
            if(method == 'ExtrinsicSuccess'){
              await virInfo.deleteMany({ belong: orderArr4[i]._id })
              await Info.updateOne({_id: orderArr4[i]._id}, {$set:{orderStatus: 5}}) // 订单取消
            }
          });
        }
      })
    }
  } catch (err) {
    console.log(err, 'checkVirtualStatus')
  }
}

checkVirtualStatus();

export const scheduleCronstyle = () => {
  schedule.scheduleJob('30 * * * * *',function(){
    checkVirtualStatus();
  });
}

scheduleCronstyle();