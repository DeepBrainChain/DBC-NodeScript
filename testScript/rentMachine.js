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
var args = minimist(process.argv.slice(2), { string: ['key', 'data'] });
let i = 0;
export const rentMachine = async (value) => {
  await GetApi();
  let accountFromKeyring = await keyring.addFromUri(args["key"]);
  await cryptoWaitReady();
  await tx( machineList[i], value, accountFromKeyring, i)
}
rentMachine(args["data"])

const tx = async (u, value , accountFromKeyring, i) => {
  await api?.tx.rentMachine
  .rentMachine( u, value )
  .signAndSend( accountFromKeyring, ( { events = [], status , dispatchError  } ) => {
    if (status.isInBlock) {
      events.forEach( async ({ event: { method, data: [error] }}) => {
        if (error.isModule && method == 'ExtrinsicFailed') {
          if( i < machineList.length -1){
            i = i+1;
            await tx(machineList[i], value , accountFromKeyring, i)
          }else{
            console.log(success, 'success');
            process.exit(0);
          }
        }else if(method == 'ExtrinsicSuccess'){
          success.push(machineList[i])
          if( i < machineList.length -1){
            i = i+1;
            await tx(machineList[i], value , accountFromKeyring, i)
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



// let user = [
//   '5F7L9bc3q4XdhVstJjVB2o7S8RHz2YKsHUB6k3uQpErTmVWu',
//   '5C5pgdmq9ye1b5TDNB8kLDUohp1TvYeEF7USYQr2L4sk1kzr',
//   '5F7L9bc3q4XdhVstJjVB2o7S8RHz2YKsHUB6k3uQpErTmVWu',
//   '5C5pgdmq9ye1b5TDNB8kLDUohp1TvYeEF7USYQr2L4sk1kzr'
// ]

// let newArray = user.map( res=> {
//   return api?.tx.balances.transfer(res, '1000000000000000')
// })

// export const utility = async () => {
//   await GetApi();
//   let accountFromKeyring = await keyring.addFromUri('artefact pull input weird erosion glare neck refuse burst nature paddle insect'); 
//   await cryptoWaitReady();
//   await api?.tx.utility
//   .batch(newArray)
//   .signAndSend( accountFromKeyring, async ( { events = [], status , dispatchError  } ) => {
//     console.log(`{"Tx_status:":"${status.type}"}`);
//     if (status.isInBlock) {
//       console.log(`{"Tx_inBlock":"${status.asInBlock.toHex()}"}`);
//       events.forEach(({ event: { data, method, section }, phase }) => {
//         console.log(
//           `{"Event":${phase.toString()},"func":"${section}.${method}","data":${data.toString()}}`
//         );
//       });
//     } else if (status.isFinalized) {
//       console.log(
//         `{"Finalized_block_hash:":"${status.asFinalized.toHex()}"} "i:${i}"`
//       );
//       process.exit(0);
//     }
//   })
// }
// utility().catch((error) => console.log(error.message))