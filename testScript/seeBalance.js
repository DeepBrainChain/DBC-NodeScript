import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, mnemonicToMiniSecret, randomAsU8a } from '@polkadot/util-crypto';
import { BN_TEN, formatBalance, isHex, stringToU8a , u8aToHex, hexToU8a, hexToString, stringToHex } from '@polkadot/util';
import BN from 'bn.js'
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import minimist from 'minimist'
import { typeJson, wssChain } from '../publicResource.js'

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
  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion, properties] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
    api.rpc.system.properties(),
  ])
  const tokenSymbol = properties.tokenSymbol.unwrapOrDefault()
  const tokenDecimals = properties.tokenDecimals.unwrapOrDefault()
  formatBalance.setDefaults({
    decimals: tokenDecimals.map((b) => b.toNumber()),
    // unit: tokenSymbol[0].toString()  测试注释
  });
  const {decimals, unit} = formatBalance.getDefaults()
  return {
    api,
    chain,
    nodeName,
    nodeVersion,
    properties,
    decimals,
    unit
  }
  // return { api }
}



export const getAccountBalance = async (wallet) => {
  await GetApi();
  let de = await api?.query.system.account('5F7L9bc3q4XdhVstJjVB2o7S8RHz2YKsHUB6k3uQpErTmVWu');
  console.log(de?.toJSON(), 'de?.toJSON()');
  return de?.toJSON();
}

// getAccountBalance();

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
// 创建账户
const keyring = new Keyring({type: 'sr25519'})
export const transfer1 = async () => {
  await GetApi();
  let CallBack_data = { success: false }
  const basePower = formatBalance.getDefaults().decimals // 小数位数
  const siPower = new BN(basePower)
  const bob = inputToBn(String(1), siPower, basePower)
  console.log(basePower, bob, 'bob');
  let accountFromKeyring = await keyring.addFromUri('smoke mom merry sea cram robust jar correct donate pledge fetch flip')
  console.log(accountFromKeyring.toJson(), 'accountFromKeyring');
  await cryptoWaitReady();
  await api?.tx.balances
  .transfer( '5GEji5DojzpeNjKZnsjh3paKR2t1qgLEBnRRpZKLc5ntGNoz', bob )
  .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
    if (status.isInBlock) {
      events.forEach(({ event: { method, data: [error] } }) => {
        if (error.isModule && method == 'ExtrinsicFailed') {
          CallBack_data.success = false
          console.log('ExtrinsicFailed');
        }else if(method == 'ExtrinsicSuccess'){
          CallBack_data.success = true
          console.log('ExtrinsicSuccess');
        }
      });
      if (callback) {
        callback(CallBack_data)
      }
    }
  })
  .catch((res)=>{
    console.log(`${res.message}`);
  })
}

// transfer1();


// 通过助记词获取密钥对
const MNEMONIC = '';

const seedAlice = mnemonicToMiniSecret(MNEMONIC);

// 通过助记词生成 Uint8Array格式的私钥
console.log(u8aToHex(seedAlice), 'seedAlice');

