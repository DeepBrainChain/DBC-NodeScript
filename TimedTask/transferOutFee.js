import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import { typeJson, wssChain, mongoUrlSeed, designatedWallet } from '../publicResource.js'
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

const checkWalletFee = async () => {
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const Info = conn.db("identifier").collection("VirtualInfo")
    const OrderInfo = conn.db("identifier").collection("virOrderInfo")
    const wallet = conn.db("identifier").collection("temporaryWallet")
    const wallet1 = conn.db("identifier").collection("SignleTemporaryWallet")
    let orderArr1 = await Info.find({orderStatus: 3}).toArray() // 查询订单中正在使用中的订单
    let orderArr2 = await OrderInfo.find({orderStatus: 3}).toArray() // 查询虚拟机订单中正在使用中的订单, 将钱包余额转到指定账户
    for(let i = 0; i < orderArr1.length; i++){
      let walletArr = await wallet.find({_id: orderArr1[i]._id}).toArray()
      let walletinfo = walletArr[0]
      let balance  = await getbalance(walletinfo.wallet)
      if( balance > 0.1 ) {
        await GetApi()
        let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
        const siPower = new BN(15)
        const bob = inputToBn(String(balance-0.1), siPower, 15)
        await cryptoWaitReady();
        await api.tx.balances
        .transfer( designatedWallet, bob )
        .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
          if (status.isInBlock) {
            events.forEach( async ({ event: { method, data: [error] } }) => {
              if(method == 'ExtrinsicSuccess'){
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
    for(let i = 0; i < orderArr2.length; i++){
      // 查询虚拟机订单中创建失败的订单，是否处于退币中，退币中，则不执行钱包余额转账操作
      // let orderArr3 = await OrderInfo.find({orderStatus: 6, belong: orderArr2[i].belong, account: orderArr2[i].account}).toArray()
      // if (orderArr3.length) {
      //   let hasRefunded = orderArr3.every((el) => {return !(el.Refunded)})
      //   console.log(hasRefunded, 'hasRefunded');
      //   if (hasRefunded) {
      //     console.log(11111);
      //     continue
      //   } else {
      //     console.log(22222);
      //     let walletArr = await wallet1.find({_id: orderArr2[i].belong+orderArr2[i].account}).toArray()
      //     let walletinfo = walletArr[0]
      //     let balance  = await getbalance(walletinfo.wallet)
      //     console.log(balance);
      //     // if ( balance > 0.1 ) {
      //     //   await GetApi()
      //     //   let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
      //     //   const siPower = new BN(15)
      //     //   const bob = inputToBn(String(balance-0.1), siPower, 15)
      //     //   await cryptoWaitReady();
      //     //   await api.tx.balances
      //     //   .transfer( designatedWallet, bob )
      //     //   .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
      //     //     if (status.isInBlock) {
      //     //       events.forEach( async ({ event: { method, data: [error] } }) => {
      //     //         if(method == 'ExtrinsicSuccess'){
      //     //           if (conn != null){
      //     //             conn.close()
      //     //             conn = null
      //     //           }
      //     //         }
      //     //       });
      //     //     }
      //     //   })
      //     // }
      //   }
      // }
      // 查询虚拟机订单中创建失败的订单，是否处于退币中，退币中，则不执行钱包余额转账操作
      let orderArr3 = await OrderInfo.find({orderStatus: 6, belong: orderArr2[i].belong, account: orderArr2[i].account}).toArray()
      if (orderArr3.length) {
        for (let k =0; k< orderArr3.length; k++) {
          if (!(orderArr3[k].Refunded)) {
            return
          }
        }
      }
      let walletArr = await wallet1.find({_id: orderArr2[i].belong+orderArr2[i].account}).toArray()
      let walletinfo = walletArr[0]
      let balance  = await getbalance(walletinfo.wallet)
      if ( balance > 0.1 ) {
        await GetApi()
        let accountFromKeyring = await keyring.addFromUri(walletinfo.seed);
        const siPower = new BN(15)
        const bob = inputToBn(String(balance-0.1), siPower, 15)
        await cryptoWaitReady();
        await api.tx.balances
        .transfer( designatedWallet, bob )
        .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
          if (status.isInBlock) {
            events.forEach( async ({ event: { method, data: [error] } }) => {
              if(method == 'ExtrinsicSuccess'){
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
  } catch (err) {
    console.log(err, 'transferOutfee')
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
}

checkWalletFee();

export const scheduleCronstyle = () => {
  schedule.scheduleJob('30 * * * * *',function(){
    checkWalletFee();
  });
}

scheduleCronstyle();
