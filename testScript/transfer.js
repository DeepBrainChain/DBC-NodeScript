import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { BN_TEN } from '@polkadot/util';
import BN from 'bn.js'
import { typeJson, wssChain } from '../publicResource.js'

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
  return {
    api
  }
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
// 创建账户
const keyring = new Keyring({type: 'sr25519'})
export const transfer1 = async ( value, seed, toWallet) => {
  await GetApi();
  const siPower = new BN(15)
  const bob = inputToBn(String(value), siPower, 15)
  let accountFromKeyring = await keyring.addFromUri(seed)
  await cryptoWaitReady();
  await api.tx.balances
  .transfer( toWallet, bob )
  .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
    if (status.isInBlock) {
      events.forEach(({ event: { method, data: [error] } }) => {
        if (error.isModule && method == 'ExtrinsicFailed') {
          console.log('transfer Failed');
        }else if(method == 'ExtrinsicSuccess'){
          console.log('transfer Success');
        }
      });
    }
  })
  .catch((res)=>{
    console.log(`${res.message}`);
  })
}

transfer1('39.66', 'your seed', 'transfer wallet');

export const dbcPriceOcw = async () => {
  await GetApi()
  let de = await api.query.dbcPriceOcw.avgPrice();
  console.log(de.toJSON(), 'de');
  return de.toJSON()
}

export const importAccountFromSeed = async ( seed ) => {
  await cryptoWaitReady()
  console.log(JSON.stringify(keyring.addFromUri(seed)), 'pair');
  // return keyring.addFromUri(seed)
}

importAccountFromSeed('0xbb96058371581485a6aacd11027db023723af922dfc49b317ff47b73353355c7')