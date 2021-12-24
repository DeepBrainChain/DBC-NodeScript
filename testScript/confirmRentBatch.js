import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from '@polkadot/util-crypto';
import minimist from "minimist";
import { typeJson, wssChain } from '../dbc_types.js'

let api  = null
const keyring = new Keyring({ type: "sr25519" });
const args = minimist(process.argv.slice(2), { string: ['key'] });
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

export const confirmRent = async () => {
  await GetApi();
  let newArray = machineList.map( res=> {
    return api.tx.rentMachine.confirmRent(res)
  })
  let accountFromKeyring = await keyring.addFromUri(args["key"]);
  await cryptoWaitReady();
  await api.tx.utility
  .batch(newArray)
  .signAndSend( accountFromKeyring, async ( { events = [], status , dispatchError  } ) => {
    console.log(`{"Tx_status:":"${status.type}"}`);
    if (status.isInBlock) {
      console.log(`included in ${status.asInBlock}`);
    }
  })
}
confirmRent().catch((error) => console.log(error.message))