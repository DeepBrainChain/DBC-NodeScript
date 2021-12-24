import { ApiPromise, WsProvider } from '@polkadot/api'
import { Keyring } from "@polkadot/keyring";
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady, randomAsU8a, signatureVerify } from '@polkadot/util-crypto'
import minimist from "minimist";
import fs from 'fs'

const keyring = new Keyring({type: 'sr25519'})

const args = minimist(process.argv.slice(2), { string:['key'] })
// var json = fs.readFileSync('demo.json')

const CreateSignature = async (password) => {
  let nonce = randomWord();
  // let jsonStr4 = JSON.parse(json.toString())
  await cryptoWaitReady();
  // let signUrl = keyring.addFromJson(jsonStr4);
  // signUrl.unlock(password)
  let signUrl = await keyring.addFromUri(args["key"]);
  const signature = signUrl.sign(nonce);
  console.log(
    'nonce ---- ' + nonce ,
    'signature ---- ' + u8aToHex(signature));
  // Verify(nonce, signature)
}


const Verify = async (msg, sign, wallet='5CkWErxCtUPWmQhmX3SXs5UckE7FNpzagHVESH4kiLbStoVK', ver = 'Verify1') => {
  await cryptoWaitReady();
  console.log(signatureVerify( msg, sign, wallet ), ver );
}
CreateSignature(args['password'])
// Verify('LsGI0SNjk3LqL7kRsIzX0lsc5o55qezfPC1x4d1Ck7kpSuh8P1fvWyr', '0x1e60d81200fe53ba038c71e8f3d57c715ee529497cb9851567df19e2b599f257a47ea6b19d850da91f82ee35f9958460b0aa48024086f491243a9507ab189e84')

function randomWord() {
  let str = "",
  arr = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z','0', '1', '2', '3', '4', '5', '6', '7', '8', '9',];
  
  for (let i = 0; i < 55; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}