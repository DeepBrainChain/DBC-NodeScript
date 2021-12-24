import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from '@polkadot/util-crypto';
import minimist from "minimist";
import { typeJson, wssChain } from '../dbc_types.js'

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
    return api.tx.rentMachine.rentMachine(res, value)
  })
  let accountFromKeyring = await keyring.addFromUri(args["key"]);
  await cryptoWaitReady();
  await api.tx.utility
  .batch(newArray)
  .signAndSend( accountFromKeyring, async ( { events = [], status , dispatchError  } ) => {
    
    if (status.isInBlock) {
      events.forEach(async ({ event: { method, data: [error] } }) => {
        // console.log(method, error, error.words, 'method');
        if (method == 'BatchInterrupted') {
          // const decoded = api?.registry.findMetaError(error.asModule);
          console.log('ExtrinsicFiles--->'+ '成功执行：' + error.words)
        }else if(method == 'BatchCompleted'){
          console.log('ExtrinsicSuccess: 全部执行')
        }
      });
    }

    // console.log(`{"Tx_status:":"${status.type}"}`);
    // if (status.isInBlock) {
    //   console.log(`included in ${status.asInBlock}`);
    //   process.exit(0)
    // }
  })
}
utility(args["data"]).catch((error) => console.log(error.message))