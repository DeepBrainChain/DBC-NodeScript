import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from "@polkadot/keyring";
import { cryptoWaitReady } from '@polkadot/util-crypto';
import minimist from "minimist";
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
  return { api }
}

let machineList= []

let success = []
const keyring = new Keyring({ type: "sr25519" });
var args = minimist(process.argv.slice(2), { string: ['key'] });
let i = 0;
export const rentMachine = async () => {
  await GetApi();
  let accountFromKeyring = await keyring.addFromUri(args["key"]);
  await cryptoWaitReady();
  await tx( machineList[i], accountFromKeyring, i)
}
rentMachine();

const tx = async (u, accountFromKeyring, i) => {
  await api?.tx.rentMachine
  .confirmRent( u )
  .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
    if (status.isInBlock) {
      events.forEach( async ({ event: { method, data: [error] }}) => {
        if (error.isModule && method == 'ExtrinsicFailed') {
          console.log(` Is ${i} : Failed`);
          if( i < machineList.length-1){
            i = i+1;
            await tx(machineList[i], accountFromKeyring, i)
          }else{
            console.log(success, 'success');
            process.exit(0);
          }
        }else if(method == 'ExtrinsicSuccess'){
          console.log(` Is ${i} : Success`);
          success.push(machineList[i])
          if( i < machineList.length-1){
            i = i+1;
            await tx(machineList[i], accountFromKeyring, i)
          }else{
            console.log(success, 'success');
            process.exit(0);
          }
        }
      });
    } else if (status.isFinalized) {
    }
  })
}
