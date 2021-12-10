import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import { cryptoWaitReady, randomAsU8a } from '@polkadot/util-crypto';
import { BN_TEN, formatBalance, isHex, stringToU8a , u8aToHex, hexToU8a, hexToString, stringToHex } from '@polkadot/util';
import BN from 'bn.js'
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import minimist from 'minimist'
const node = {
  dbc: 'wss://info.dbcwallet.io'
}

const MongoClient = mongodb.MongoClient;
const url = "mongodb://localhost:27017";
let api  = null
// 链上交互
export const GetApi = async () =>{
  if (!api) {
    const provider = new WsProvider(node.dbc)
    api = await ApiPromise.create({ 
      provider ,
      types: {
        "Pubkey": "Vec<u8>",
        "ReportId": "u64",
        "SlashId": "u64",
        "BoxPubkey": "[u8; 32]",
        "ReportHash": "[u8; 16]",
        "URL": "Text",
        "MachineId": "Text",
        "OrderId": "u64",
        "TelecomName": "Text",
        "StandardGpuPointPrice": {
          "gpu_point": "u64",
          "gpu_price": "u64"
        },
        "LiveMachine": {
          "bonding_machine": "Vec<MachineId>",
          "confirmed_machine": "Vec<MachineId>",
          "booked_machine": "Vec<MachineId>",
          "online_machine": "Vec<MachineId>",
          "fulfilling_machine": "Vec<MachineId>",
          "refused_machine": "Vec<MachineId>",
          "rented_machine": "Vec<MachineId>",
          "offline_machine": "Vec<MachineId>",
          "refused_mut_hardware_machine": "Vec<MachineId>"
        },
        "StashMachine": {
          "total_machine": "Vec<MachineId>",
          "online_machine": "Vec<MachineId>",
          "total_calc_points": "u64",
          "total_gpu_num": "u64",
          "total_rented_gpu": "u64",
          "total_earned_reward": "Balance",
          "total_claimed_reward": "Balance",
          "can_claim_reward": "Balance",
          "total_rent_fee": "Balance",
          "total_burn_fee": "Balance"
        },
        "SysInfoDetail": {
          "total_gpu_num": "u64",
          "total_rented_gpu": "u64",
          "total_staker": "u64",
          "total_calc_points": "u64",
          "total_stake": "Balance",
          "total_rent_fee": "Balance",
          "total_burn_fee": "Balance"
        },
        "UserReonlineStakeInfo": {
          "stake_amount": "Balance",
          "offline_time": "BlockNumber"
        },
        "MachineInfo": {
          "controller": "AccountId",
          "machine_stash": "AccountId",
          "last_machine_renter": "Option<AccountId>",
          "last_machine_restake": "BlockNumber",
          "bonding_height": "BlockNumber",
          "online_height": "BlockNumber",
          "last_online_height": "BlockNumber",
          "init_stake_per_gpu": "Balance",
          "stake_amount": "Balance",
          "machine_status": "MachineStatus",
          "total_rented_duration": "u64",
          "total_rented_times": "u64",
          "total_rent_fee": "Balance",
          "total_burn_fee": "Balance",
          "machine_info_detail": "MachineInfoDetail",
          "reward_committee": "Vec<AccountId>",
          "reward_deadline": "EraIndex"
        },
        "MachineStatus": {
          "_enum": {
            "AddingCustomizeInfo": null,
            "DistributingOrder": null,
            "CommitteeVerifying": null,
            "CommitteeRefused": "BlockNumber",
            "WaitingFulfill": null,
            "Online": null,
            "StakerReportOffline": "(BlockNumber, Box<MachineStatus>)",
            "ReporterReportOffline": "(StashSlashReason, Box<MachineStatus>, AccountId, Vec<AccountId>)",
            "Creating": null,
            "Rented": null
          }
        },
        "MachineInfoDetail": {
          "committee_upload_info": "CommitteeUploadInfo",
          "staker_customize_info": "StakerCustomizeInfo"
        },
        "CommitteeUploadInfo": {
          "machine_id": "MachineId",
          "gpu_type": "Vec<u8>",
          "gpu_num": "u32",
          "cuda_core": "u32",
          "gpu_mem": "u64",
          "calc_point": "u64",
          "sys_disk": "u64",
          "data_disk": "u64",
          "cpu_type": "Vec<u8>",
          "cpu_core_num": "u32",
          "cpu_rate": "u64",
          "mem_num": "u64",
          "rand_str": "Vec<u8>",
          "is_support": "bool"
        },
        "StakerCustomizeInfo": {
          "server_room": "H256",
          "upload_net": "u64",
          "download_net": "u64",
          "longitude": "Longitude",
          "latitude": "Latitude",
          "telecom_operators": "Vec<TelecomName>"
        },
        "Longitude": {
          "_enum": {
            "East": "u64",
            "West": "u64"
          }
        },
        "Latitude": {
          "_enum": {
            "South": "u64",
            "North": "u64"
          }
        },
        "EraStashPoints": {
          "total": "u64",
          "staker_statistic": "BTreeMap<AccountId, StashMachineStatistics>"
        },
        "StashMachineStatistics": {
          "online_gpu_num": "u64",
          "inflation": "Perbill",
          "machine_total_calc_point": "u64",
          "rent_extra_grade": "u64"
        },
        "PosInfo": {
          "online_gpu": "u64",
          "offline_gpu": "u64",
          "rented_gpu": "u64",
          "online_gpu_calc_points": "u64"
        },
        "MachineGradeStatus": {
          "basic_grade": "u64",
          "is_rented": "bool"
        },
        "CommitteeList": {
          "normal": "Vec<AccountId>",
          "chill_list": "Vec<AccountId>",
          "waiting_box_pubkey": "Vec<AccountId>",
          "fulfilling_list": "Vec<AccountId>"
        },
        "OCCommitteeMachineList": {
          "booked_machine": "Vec<MachineId>",
          "hashed_machine": "Vec<MachineId>",
          "confirmed_machine": "Vec<MachineId>",
          "online_machine": "Vec<MachineId>"
        },
        "OCCommitteeOps": {
          "staked_dbc": "Balance",
          "verify_time": "Vec<BlockNumber>",
          "confirm_hash": "[u8; 16]",
          "hash_time": "BlockNumber",
          "confirm_time": "BlockNumber",
          "machine_status": "OCMachineStatus",
          "machine_info": "CommitteeUploadInfo"
        },
        "OCMachineStatus": {
          "_enum": ["Booked", "Hashed", "Confirmed"]
        },
        "OCMachineCommitteeList": {
          "book_time": "BlockNumber",
          "booked_committee": "Vec<AccountId>",
          "hashed_committee": "Vec<AccountId>",
          "confirm_start_time": "BlockNumber",
          "confirmed_committee": "Vec<AccountId>",
          "onlined_committee": "Vec<AccountId>",
          "status": "OCVerifyStatus"
        },
        "OCVerifyStatus": {
          "_enum": ["SubmittingHash", "SubmittingRaw", "Summarizing", "Finished"]
        },
        "ReporterReportList": {
          "processing_report": "Vec<ReportId>",
          "canceled_report": "Vec<ReportId>",
          "succeed_report": "Vec<ReportId>",
          "failed_report": "Vec<ReportId>"
        },
        "MTCommitteeOpsDetail": {
          "booked_time": "BlockNumber",
          "encrypted_err_info": "Option<Vec<u8>>",
          "encrypted_time": "BlockNumber",
          "confirm_hash": "ReportHash",
          "hash_time": "BlockNumber",
          "extra_err_info": "Vec<u8>",
          "confirm_time": "BlockNumber",
          "confirm_result": "bool",
          "staked_balance": "Balance",
          "order_status": "MTOrderStatus"
        },
        "MTOrderStatus": {
          "_enum": ["WaitingEncrypt", "Verifying", "WaitingRaw", "Finished"]
        },
        "MTCommitteeOrderList": {
          "booked_report": "Vec<ReportId>",
          "hashed_report": "Vec<ReportId>",
          "confirmed_report": "Vec<ReportId>",
          "finished_report": "Vec<ReportId>"
        },
        "MTLiveReportList": {
          "bookable_report": "Vec<ReportId>",
          "verifying_report": "Vec<ReportId>",
          "waiting_raw_report": "Vec<ReportId>",
          "finished_report": "Vec<ReportId>"
        },
        "MTPendingSlashInfo": {
          "slash_who": "AccountId",
          "slash_time": "BlockNumber",
          "slash_amount": "Balance",
          "slash_exec_time": "BlockNumber",
          "reward_to": "Vec<AccountId>",
          "slash_reason": "MTReporterSlashReason"
        },
        "MTReporterSlashReason": {
          "_enum": ["ReportRefused", "NotSubmitEncryptedInfo"]
        },
        "MTReportInfoDetail": {
          "reporter": "AccountId",
          "report_time": "BlockNumber",
          "reporter_stake": "Balance",
          "first_book_time": "BlockNumber",
          "machine_id": "MachineId",
          "err_info": "Vec<u8>",
          "verifying_committee": "Option<AccountId>",
          "booked_committee": "Vec<AccountId>",
          "get_encrypted_info_committee": "Vec<AccountId>",
          "hashed_committee": "Vec<AccountId>",
          "confirm_start": "BlockNumber",
          "confirmed_committee": "Vec<AccountId>",
          "support_committee": "Vec<AccountId>",
          "against_committee": "Vec<AccountId>",
          "report_status": "ReportStatus",
          "machine_fault_type": "MachineFaultType"
        },
        "ReportStatus": {
          "_enum": [
            "Reported",
            "WaitingBook",
            "Verifying",
            "SubmittingRaw",
            "CommitteeConfirmed"
          ]
        },
        "MachineFaultType": {
          "_enum": {
            "RentedInaccessible": "MachineId",
            "RentedHardwareMalfunction": "(ReportHash, BoxPubkey)",
            "RentedHardwareCounterfeit": "(ReportHash, BoxPubkey)",
            "OnlineRentFailed": "(ReportHash, BoxPubkey)"
          }
        },
        "CMPendingSlashInfo": {
          "slash_who": "AccountId",
          "slash_time": "BlockNumber",
          "slash_amount": "Balance",
          "slash_exec_time": "BlockNumber",
          "reward_to": "Vec<AccountId>"
        },
        "CMSlashReason": {
          "_enum": [
            "OCNotSubmitHash",
            "OCNotSubmitRaw",
            "OCInconsistentSubmit",
            "MCNotSubmitHash",
            "MCNotSubmitRaw",
            "MCInconsistentSubmit"
          ]
        },
        "OnlineStakeParamsInfo": {
          "online_stake_per_gpu": "Balance",
          "online_stake_usd_limit": "u64",
          "reonline_stake": "u64"
        },
        "OPPendingSlashInfo": {
          "slash_who": "AccountId",
          "slash_time": "BlockNumber",
          "slash_amount": "Balance",
          "slash_exec_time": "Option<BlockNumber>",
          "reward_to": "Option<Vec<AccountId>>",
          "slash_reason": "OPSlashReason"
        },
        "OPSlashReason": {
          "_enum": {
            "RentedReportOffline": "BlockNumber",
            "OnlineReportOffline": "BlockNumber",
            "RentedInaccessible": "BlockNumber",
            "RentedHardwareMalfunction": "BlockNumber",
            "RentedHardwareCounterfeit": "BlockNumber",
            "OnlineRentFailed": "BlockNumber",
            "CommitteeRefusedOnline": null,
            "CommitteeRefusedMutHardware": null,
            "ReonlineShouldReward": null
          }
        },
        "RentOrderDetail": {
          "renter": "AccountId",
          "rent_start": "BlockNumber",
          "confirm_rent": "BlockNumber",
          "rent_end": "BlockNumber",
          "stake_amount": "Balance",
          "rent_status": "RentStatus"
        },
        "RentStatus": {
          "_enum": ["WaitingVerifying", "Renting", "RentExpired"]
        },
        "CommitteeStakeParamsInfo": {
          "stake_baseline": "Balance",
          "stake_per_order": "Balance",
          "min_free_stake_percent": "Perbill"
        },
        "CommitteeStakeInfo": {
          "box_pubkey": "[u8; 32]",
          "staked_amount": "Balance",
          "used_stake": "Balance",
          "can_claim_reward": "Balance",
          "claimed_reward": "Balance"
        },
        "ReporterStakeParamsInfo": {
          "stake_baseline": "Balance",
          "stake_per_report": "Balance",
          "min_free_stake_percent": "Perbill"
        },
        "ReporterStakeInfo": {
          "staked_amount": "Balance",
          "used_stake": "Balance",
          "can_claim_reward": "Balance",
          "claimed_reward": "Balance"
        }
      }
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