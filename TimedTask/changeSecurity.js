import mongodb from 'mongodb'
import schedule from 'node-schedule'
import httpRequest from 'request-promise';
import { baseUrl, mongoUrlSeed } from '../publicResource.js'
import { decryptByAes256 } from '../testscript/crypto.js'
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
const mongoUrl = decryptByAes256(mongoUrlSeed)
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
let conn = null
const keyring = new Keyring({type: 'sr25519'})

// nonce生成
const createNonce = () => {
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

const CreateSignature = async (seed) => {
  let nonce = createNonce()
  await cryptoWaitReady()
  let signUrl = await keyring.addFromUri(seed)
  const signature = u8aToHex(signUrl.sign(nonce))
  return { nonce, signature }
}

const checkvirSG = async () => {
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const virtualTask = conn.db("identifier").collection("virtualTask") // 虚拟机列表
    const virtualInfo = conn.db("identifier").collection("VirtualInfo") // 整机租用订单列表
    const wallet = conn.db("identifier").collection("temporaryWallet") // 订单的钱包账号
    const security = conn.db("identifier").collection("securityGroup") // 安全组列表
    const SGRule = conn.db("identifier").collection("securityRule") // 安全组规则列表
    const SGArr = await security.find({setting: true}).toArray({}) // 需要修改虚拟机安全组的机器
    for (let i = 0; i< SGArr.length; i++) {
      const TaskArr = await virtualTask.find({ network_Id: SGArr[i]._id, SgIsChange: true }).toArray()
      let allTask = []
      let errTask = []
      let endTask = []
      for (let j = 0; j< TaskArr.length; j++) {
        const InfoArr = await virtualInfo.find({_id: TaskArr[j].belong}).toArray()
        const walletArr = await wallet.find({_id: TaskArr[j].belong}).toArray()
        const virInfo = InfoArr.length ? InfoArr[0] : {}
        const walletInfo = walletArr[0]
        if (virInfo.orderStatus == 3 || virInfo.orderStatus == 2) {
          let taskinfo = {}
          try {
            let { nonce: nonce1, signature: sign1 } = await CreateSignature(walletInfo.seed)
            let new_network_filters = []
            const rule = await SGRule.find({belong: SGArr[i]._id}).toArray()
            rule.map(el1 => {
              let str = `${el1.direction},${el1.protocol},${el1.port},${el1.object},accept`
              new_network_filters.push(str)
            })
            let perams = {
              "new_network_filters": new_network_filters // 安全组
            }
            taskinfo = await httpRequest({
              url: baseUrl + "/api/v1/tasks/modify/"+TaskArr[j].task_id,
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [virInfo.machine_id], 
                "additional": perams,
                "nonce": nonce1,
                "sign": sign1,
                "wallet": walletInfo.wallet
              }
            })
          } catch (err) {
            taskinfo = {
              message: err.message
            }
          }
          if (taskinfo.errcode != undefined || taskinfo.errcode != null) {
            taskinfo = taskinfo
          } else {
            if (taskinfo.netcongtu || taskinfo.mainnet) {
              if (machine_id.indexOf('CTC') != -1) {
                taskinfo = taskinfo.netcongtu
              } else {
                taskinfo = taskinfo.mainnet
              }
            } else {
              taskinfo = taskinfo
            }
          }
          if (taskinfo&&taskinfo.errcode == 0) {
            allTask.push(taskinfo)
            await virtualTask.updateOne({_id: TaskArr[j]._id}, {$set: {SgIsChange: false}})
          }else {
            errTask.push(taskinfo)
          }
        }
        if (virInfo.orderStatus == 4 || virInfo.orderStatus == 5) {
          endTask.push(virInfo)
        }
      }
      if (!errTask.length && !endTask.length) {
        await security.updateOne({_id: SGArr[i]._id},{$set: {setting: false}})
        await SGRule.updateMany({belong: SGArr[i]._id},{$set: {action: 'allow'}})
      }
    }
  } catch (err) {
    console.log(err, 'checkvirSG')
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
}

checkvirSG();

export const scheduleCronstyle = () => {
  schedule.scheduleJob('30 * * * * *',function(){
    checkvirSG();
  });
}

scheduleCronstyle();