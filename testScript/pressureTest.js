import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, randomAsU8a } from '@polkadot/util-crypto';
import { BN_TEN, formatBalance, isHex, stringToU8a , u8aToHex, hexToU8a, hexToString, stringToHex } from '@polkadot/util';
import BN from 'bn.js'
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import minimist from 'minimist'
import { typeJson, wssChain, mongoUrl } from '../publicResource.js'

const MongoClient = mongodb.MongoClient;
const url = "mongodb://localhost:27017";
let api  = null
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
var args = minimist(process.argv.slice(2), { string: ['key'] });
let allWallet = []
let hour = 7
/**
 *  创建钱包
 * @param permas
 * @return callback 回调函数，返回数组信息
 */

// 获取转账金额
const random = (min, max) => {
  return Math.floor(Math.random() * (max - min)) + min;
}

// 创建账户
const keyring = new Keyring({type: 'sr25519'})
export const createAccountFromSeed = async () => {
  if (keyring) {
    await cryptoWaitReady()
    const DBC = (hour == 1 ? random(1, 100) + 0.48 : 0)
    const seed = u8aToHex(randomAsU8a())
    const pair = keyring.addFromUri(seed)
    return {
      _id: seed,
      pair: pair.address,
      DBC
    }
  }
  return null
}

// 获取测试钱包 1000 个
export const getList = async () => {
  var conn = null;
  try {
    conn = await MongoClient.connect(url);
    const test = conn.db("test").collection("walletInfoss");
    for(let i = 0; i< 1000; i++){
      let info = await createAccountFromSeed();
      info.time = hour
      info.hasTransfer = false
      allWallet.push(info)
    }
    if(allWallet.length){
      await test.insertMany(allWallet)
    }
  } catch (err) {
    console.log("错误：" + err);
  } finally {
    if (conn != null) conn.close();
    // batchTransfer()
    hour == 1 ? batchTransfer() : TF()
  }
}

// 批量转账操作 1000 个
export const batchTransfer = async () => {
  var conn = null;
  try {
    // await getList();
    conn = await MongoClient.connect(url);
    const test = conn.db("test").collection("walletInfoss");
    let wallet = await test.find({time: hour, hasTransfer: false}).toArray()
    let Result = await Transfer(wallet)
  } catch (err) {
    console.log("错误：" + err);
  } finally {
    if (conn != null) conn.close();
  }
}



console.log('hour: ' + hour);
// getList()

const scheduleCronstyle = ()=>{
  //每小时的第15分30秒定时执行一次:
  schedule.scheduleJob('30 15 * * * *',()=>{
    allWallet = []
    hour++;
    console.log('hour: ' + hour);
    getList()
  });
}

// scheduleCronstyle();



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

// 批量转账
export const Transfer = async (walletList) => {
  if(walletList.length == 0){
    console.log('无可转账钱包')
    return false;
  }
  await GetApi();
  const basePower = formatBalance.getDefaults().decimals // 小数位数
  console.log(basePower, 'basePower');
  const siPower = new BN(basePower)
  let tsArray = []
  for(let i =0; i< walletList.length; i++){
    let bob = inputToBn(String(walletList[i].DBC), siPower, basePower)
    tsArray.push(api?.tx.balances.transfer( walletList[i].pair, bob ))
  }
  // console.log(tsArray, 'tsArray');
  let accountFromKeyring = await keyring.addFromUri('smoke mom merry sea cram robust jar correct donate pledge fetch flip')
  await cryptoWaitReady();
  await api?.tx.utility
  .batch(tsArray)
  .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
    if (status.isInBlock) {
      events.forEach(async ({ event: { method, data: [error] } }) => {
        // console.log(method, error, error.words, 'method');
        if (method == 'BatchInterrupted') {
          // const decoded = api?.registry.findMetaError(error.asModule);
          console.log('ExtrinsicFiles--->'+ '成功执行：' + error.words)
          var conn = null;
          try {
            conn = await MongoClient.connect(url);
            const test = conn.db("test").collection("walletInfoss");
            for(let k = 0; k < error.words; k++ ) {
              await test.updateOne({time: hour, hasTransfer: false}, {$set: {hasTransfer: true}})
            }
            console.log('更新完成')
          } catch (err) {
            console.log("错误：" + err);
          } finally {
            if (conn != null) conn.close();
          }
        }else if(method == 'BatchCompleted'){
          console.log('ExtrinsicSuccess: 全部执行')
          var conn = null;
          try {
            conn = await MongoClient.connect(url);
            const test = conn.db("test").collection("walletInfoss");
            await test.updateMany({time: hour, hasTransfer: false}, {$set: {hasTransfer: true}})
            console.log('更新完成')
          } catch (err) {
            console.log("错误：" + err);
          } finally {
            if (conn != null) conn.close();
          }
        }
      });
    }
  })
  .catch((res)=>{
    console.log('fail: '+res.message)
  })
}

// batchTransfer();

// 1000对1000转账
export const TF = async () => {
  var conn = null;
  try {
    conn = await MongoClient.connect(url);
    const test = conn.db("test").collection("walletInfoss");
    let firstwallet = await test.find({time: hour - 1}).toArray()
    let lastwallet = await test.find({time: hour}).toArray()
    await GetApi();
    for(let i =0; i< firstwallet.length; i++){
      await transfer1(firstwallet[i]._id, lastwallet[i].pair, (firstwallet[i].DBC == 0 ? 0 :firstwallet[i].DBC - 0.02), i, (data)=> {
        if(data.success){
          test.updateOne({pair: lastwallet[i].pair}, {$set: { DBC: firstwallet[i].DBC - 0.02, hasTransfer: true}})
          test.updateOne({pair: firstwallet[i].pair}, {$set: { DBC: 0.02, hasTransfer: true}})
        }else{
          console.log(`第 ${hour} 小时 失败调用第 ${i} 个`);
          // test.updateOne({pair: lastwallet[i].pair}, {$set: { DBC: (lastwallet[i].DBC - 0.025), hasTransfer: true}})
        }
      })
    }
  } catch (err) {
    console.log("错误：" + err);
  }
}
// 单个转账
export const transfer1 = async ( secert, dest, value, i, callback) => {
  let CallBack_data = { success: false }
  const basePower = formatBalance.getDefaults().decimals // 小数位数
  const siPower = new BN(basePower)
  const bob = inputToBn(String(value), siPower, basePower)
  let accountFromKeyring = await keyring.addFromUri(secert)
  await cryptoWaitReady();
  await api?.tx.balances
  .transfer( dest, bob )
  .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
    if (status.isInBlock) {
      events.forEach(({ event: { method, data: [error] } }) => {
        if (error.isModule && method == 'ExtrinsicFailed') {
          CallBack_data.success = false
        }else if(method == 'ExtrinsicSuccess'){
          CallBack_data.success = true
        }
      });
      if (callback) {
        callback(CallBack_data)
      }
    }
  })
  .catch((res)=>{
    console.log(`第 ${hour} 个小时 第 ${i} 个报错： ${res.message}`);
  })
}

// TF()



// 1000对1转账
export const TF1 = async () => {
  var conn = null;
  try {
    conn = await MongoClient.connect(url);
    const test = conn.db("test").collection('walletInfoss');
    // db.getCollection('walletInfoss').find({time: 11}).skip(535)  --> 11小时剩余未转金额
    // db.getCollection('walletInfoss').find({time: 12}).skip(531).limit(4) --> 12小时剩余未转金额 4个
    // db.getCollection('walletInfoss').find({time: 23}).limit(531) --> 23小时已转金额 531 个
    let firstwallet = await test.find({DBC: 0.02}).toArray()
    // let lastwallet = await test.find({time: hour}).toArray()
    await GetApi();
    for(let i =0; i< firstwallet.length; i++){
      await transfer1(firstwallet[i]._id, '5F7L9bc3q4XdhVstJjVB2o7S8RHz2YKsHUB6k3uQpErTmVWu', (firstwallet[i].DBC == 0 ? 0 :firstwallet[i].DBC - 0.001), i, (data)=> {
        // console.log(firstwallet[i].DBC - 0.001, 'firstwallet[i].DBC - 0.004');
        if(data.success){
          // console.log(`第 1 小时 成功调用第 ${i} 个`);
          // test.updateOne({pair: lastwallet[i].pair}, {$set: { DBC: firstwallet[i].DBC - 0.02, hasTransfer: true}})
          test.updateOne({pair: firstwallet[i].pair}, {$set: { DBC: 0.001, hasTransfer: true}})
        }else{
          console.log(`第 1 小时 失败调用第 ${i} 个`);
          // test.updateOne({pair: lastwallet[i].pair}, {$set: { DBC: (lastwallet[i].DBC - 0.025), hasTransfer: true}})
        }
      })
    }
  } catch (err) {
    console.log("错误：" + err);
  }
}

TF1();