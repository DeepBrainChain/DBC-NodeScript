import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from '@polkadot/util-crypto';
import minimist from "minimist";
import { typeJson, wssChain, mongoUrl } from '../publicResource.js'

let api  = null
const keyring = new Keyring({ type: "sr25519" });
const args = minimist(process.argv.slice(2), { string: ['key', 'data'] });
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

let machineList= []

export const utility = async (value) => {
  await GetApi();
  let newArray = machineList.map( res=> {
    return api.tx.rentMachine.reletMachine(res, value)
  })
  let accountFromKeyring = await keyring.addFromUri(args["key"]);
  await cryptoWaitReady();
  await api.tx.utility
  .batch(newArray)
  .signAndSend( accountFromKeyring, async ( { events = [], status , dispatchError  } ) => {
    
    if (status.isInBlock) {
      events.forEach(async ({ event: { method, data: [error] } }) => {
        if (method == 'BatchInterrupted') {
          console.log('ExtrinsicFiles--->'+ '成功执行：' + error.words)
        }else if(method == 'BatchCompleted'){
          console.log('ExtrinsicSuccess: 全部执行')
        }
      });
    }
  })
}
utility(args["data"]).catch((error) => console.log(error.message))