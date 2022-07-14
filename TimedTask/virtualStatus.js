import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import { typeJson, wssChain, mongoUrlSeed } from '../publicResource.js'
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

/**
 * machinesInfo 根据机器id查询机器状态 Online Creating Rented
 * @param permas
 */
 export const machinesInfo = async (machineId) => {
  await GetApi()
  const info = await api.query.onlineProfile.machinesInfo(machineId)
  return info.toHuman()
}

/**
 * machinesInfo 根据机器id查询机器租用状态 Online Creating Rented
 * @param permas
 */
 export const rentOrder = async (machineId) => {
  await GetApi()
  const info = await api.query.rentMachine.rentOrder(machineId)
  return info.toHuman()
}


const checkVirtualStatus = async () => {
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const Info = conn.db("identifier").collection("VirtualInfo")
    const wallet = conn.db("identifier").collection("temporaryWallet")
    const virInfo = conn.db("identifier").collection("virtualTask")
    const security = conn.db("identifier").collection("securityGroup")
    const getSession = conn.db("identifier").collection("sessionInfo");
    let orderArr1 = await Info.find({orderStatus: 2}).toArray() // 查询订单中待确认租用的订单
    let orderArr2 = await Info.find({orderStatus: 3}).toArray() // 查询订单中正在使用中的订单
    let orderArr3 = await Info.find({orderStatus: 4}).toArray() // 查询订单中结束的订单
    let orderArr4 = await Info.find({orderStatus: 6}).toArray() // 查询订单中正在退币的订单
    let orderArr5 = await Info.find({orderStatus: 5}).toArray() // 查询订单中取消的订单
    let orderArr6 = await Info.find({errRefund: true}).toArray() // 查询退币失败的订单
    for(let i = 0; i < orderArr1.length; i++){
      if (orderArr1[i].createTime + 15*60*1000 < Date.now()) {
        await Info.updateOne({_id: orderArr1[i]._id}, {$set:{orderStatus: 6, network_name: ''}})
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
                let Info1 = null
                let conn1 = null
                // let virInfo1 = null
                conn1 = await MongoClient.connect(url, { useUnifiedTopology: true })
                Info1 = conn1.db("identifier").collection("VirtualInfo")
                  // virInfo1 = conn.db("identifier").collection("virtualTask")
                // await virInfo1.deleteMany({ belong: orderArr1[i]._id })
                await Info1.updateOne({_id: orderArr1[i]._id}, {$set:{orderStatus: 5, network_name: ''}}) // 订单取消
                if (conn1 != null){
                  conn1.close()
                  conn1 = null
                }
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
          await Info.updateOne({_id: orderArr2[i]._id}, {$set:{orderStatus: 4, network_name: ''}}) // 订单结束
        // }
      }
    }
    for(let i = 0; i < orderArr3.length; i++){ // 9天删除数据库中对应的结束订单虚拟机 / 订单结束两天后如果含有举报质押的订单，接触剩余质押退币给用户
      await virInfo.updateMany({ belong: orderArr3[i]._id }, {$set:{status: 'closed'}})
      await getSession.deleteOne({ _id: orderArr3[i]._id })
      if ((orderArr3[i].createTime + orderArr3[i].day*24*60*60*1000 + 777600000) < Date.now()) {
        let virArr = await virInfo.find({ belong: orderArr3[i]._id }).toArray()
        for (let j = 0; j < virArr.length; j++) {
          let SGarr1 = await security.find({_id: virArr[j].network_Id}).toArray()
          if (SGarr1.length) {
            await security.updateOne({_id: virArr[j].network_Id}, {$set: {bindVM: SGarr1[0].bindVM - 1}})
          }
        }
        await virInfo.deleteMany({ belong: orderArr3[i]._id })
      }
      if (orderArr3[i].reportErr.indexOf('ending') != -1) {
        let walletArr = await wallet.find({_id: orderArr3[i]._id}).toArray()
        let walletinfo = walletArr[0]
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
              if (method == 'ExtrinsicSuccess') {
                await search.updateOne({_id: id}, {$set:{ reportErr: 'cancal-unstake-success' }})
              }
            });
          }
        })
      }
    }
    for(let i = 0; i < orderArr5.length; i++){ // 9天删除数据库中对应的取消订单虚拟机
      await virInfo.updateMany({ belong: orderArr5[i]._id }, {$set:{status: 'closed'}})
      await getSession.deleteOne({ _id: orderArr5[i]._id })
      if ((orderArr5[i].createTime + 172800000) < Date.now() && !(orderArr5[i].searchHidden)) {
        let virArr = await virInfo.find({ belong: orderArr5[i]._id }).toArray()
        for (let j = 0; j < virArr.length; j++) {
          let SGarr1 = await security.find({_id: virArr[j].network_Id}).toArray()
          if (SGarr1.length) {
            await security.updateOne({_id: virArr[j].network_Id}, {$set: {bindVM: SGarr1[0].bindVM - 1}})
          }
        }
        await Info.updateOne({_id: orderArr5[i]._id}, {$set:{ searchHidden: true }})
      }
      if ((orderArr5[i].createTime + orderArr5[i].day*24*60*60*1000 + 777600000) < Date.now()) {
        await virInfo.deleteMany({ belong: orderArr5[i]._id })
      }
    }
    for(let i = 0; i < orderArr4.length; i++){
      await GetApi()
      let walletArr = await wallet.find({_id: orderArr4[i]._id}).toArray()
      let walletinfo = walletArr[0]
      let balance  = await getbalance(walletinfo.wallet)
      if ( balance > (orderArr4[i].dbc - 20)) {
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
                let Info1 = null
                let conn1 = null
                conn1 = await MongoClient.connect(url, { useUnifiedTopology: true })
                Info1 = conn1.db("identifier").collection("VirtualInfo")
                await Info1.updateOne({_id: orderArr4[i]._id}, {$set:{orderStatus: 5, network_name: ''}}) // 订单取消
                if (conn1 != null){
                  conn1.close()
                  conn1 = null
                }
              }
            });
          }
        })
      } else {
        let Info1 = null
        let conn1 = null
        conn1 = await MongoClient.connect(url, { useUnifiedTopology: true })
        Info1 = conn1.db("identifier").collection("VirtualInfo")
        const rentOrd = await rentOrder(orderArr4[i].machine_id)
        if (rentOrd.rent_status == 'Renting' && rentOrd.renter == walletinfo.wallet) {
          await Info1.updateOne({_id: orderArr4[i]._id}, {$set:{orderStatus: 3}}) // 订单出错，但已被租用
        } else {
          await Info1.updateOne({_id: orderArr4[i]._id}, {$set:{orderStatus: 5, network_name: ''}}) // 订单取消
        }
        if (conn1 != null){
          conn1.close()
          conn1 = null
        }
      }
    }
    for(let i = 0; i < orderArr6.length; i++){
      await GetApi()
      let walletArr = await wallet.find({_id: orderArr6[i]._id}).toArray()
      let walletinfo = walletArr[0]
      let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
      const siPower = new BN(15)
      const bob = inputToBn(String(orderArr6[i].dbc-10), siPower, 15)
      await cryptoWaitReady();
      await api.tx.balances
      .transfer( orderArr6[i].wallet, bob )
      .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
        if (status.isInBlock) {
          events.forEach( async ({ event: { method, data: [error] } }) => {
            if(method == 'ExtrinsicSuccess'){
              let Info1 = null
              let conn1 = null
              conn1 = await MongoClient.connect(url, { useUnifiedTopology: true })
              Info1 = conn1.db("identifier").collection("VirtualInfo")
              await Info1.updateOne({_id: orderArr6[i]._id}, {$set:{errRefund: false}})
              if (conn1 != null){
                conn1.close()
                conn1 = null
              }
            }
          });
        }
      })
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