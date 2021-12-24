import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import { typeJson, wssChain } from '../dbc_types.js'
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { BN_TEN } from '@polkadot/util';
import BN from 'bn.js'
const MongoClient = mongodb.MongoClient;
// const url = "mongodb://dbc:dbcDBC2017xY@localhost:27017/identifier";
const url = "mongodb://localhost:27017/identifier";
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
    // console.log('[modString]->', modString)
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
    let orderArr1 = await Info.find({orderStatus: 2}).toArray() // 查询订单中待确认租用的订单
    let orderArr2 = await Info.find({orderStatus: 3}).toArray() // 查询订单中正在使用中的订单
    for(let i = 0; i < orderArr1.length; i++){
      if (orderArr1[i].createTime + 30*60*1000 < Date.now()) {
        let info = await machinesInfo(orderArr1[i].machine_id)
        if (Object.keys(info.machine_status)[0] == 'Online') {
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
                if(method == 'ExtrinsicSuccess'){
                  await Info.updateOne({_id: orderArr1[i]._id}, {$set:{orderStatus: 5}}) // 订单取消
                }
              });
            }
          })
        }
      }
    }
    for(let i = 0; i < orderArr2.length; i++){
      if (orderArr2[i].createTime + orderArr2[i].day*24*60*60*1000 < Date.now()) {
        let info = await machinesInfo(orderArr2[i].machine_id)
        if (Object.keys(info.machine_status)[0] == 'Online') {
          await Info.updateOne({_id: orderArr2[i]._id}, {$set:{orderStatus: 4}}) // 订单结束
        }
      }
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