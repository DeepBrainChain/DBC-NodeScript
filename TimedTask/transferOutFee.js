import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import { typeJson, wssChain, mongoUrl, designatedWallet } from '../publicResource.js'
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
    const wallet = conn.db("identifier").collection("temporaryWallet")
    let orderArr1 = await Info.find({orderStatus: 3}).toArray() // 查询订单中正在使用中的订单
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