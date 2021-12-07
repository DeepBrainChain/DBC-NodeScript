import { ApiPromise, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'

const node = {
  dbc: 'wss://info.dbcwallet.io'
}

const MongoClient = mongodb.MongoClient;
const url = "mongodb://dbc:dbcDBC2017xY@localhost:27017/identifier";
// const url = "mongodb://localhost:27017/test";
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
  return { api }
}

/**
 * committeeStake 获取验证过机器的委员会名单
 * @param permas
 * @return callback 回调函数，返回数组信息
 */
 export const committeeStake = async ( EraIndex, MachineId) => {
  await GetApi()
  let totalReward = await api.query.committee.committeeStake.keys()
  let commitList = totalReward.map(({ args: [era] }) => {
    return era.toJSON()
  })
  return commitList
}



/**
 * leaseCommitteeOps 获取验证人验证的机器
 * @param permas
 * @return callback 回调函数，返回数组信息
 */
 export const leaseCommitteeOps = async (wallet) => {
  await GetApi();
  let de = await api.query.onlineCommittee.committeeMachine(wallet)
  return de.toHuman()
}
/**
 * machinesInfo 查询机器的详细信息
 * @param permas
 * @return callback 回调函数，返回数组信息
 */
export const machinesInfo = async ( day, machineId) => {
  await GetApi();
  let de = await api.query.onlineProfile.machinesInfo(machineId)
  let reward = await erasMachineReleasedReward( day, machineId )
  let data = {
    todayReward: Number(reward),
    info: de.toHuman()
  }
  return data
}
/**
 * 查询当前是链上第几天
 * currentEra
*/
export const currentEra = async () => {
  await GetApi()
  let nowDay = await api.query.onlineProfile.currentEra()
  console.log(nowDay.toHuman(), 'currentEra')
  return nowDay.toHuman()
}
/**
 * 查询机器在指定的某天获得的具体收益
 * erasMachineReleasedReward
*/
export const erasMachineReleasedReward = async ( EraIndex, MachineId) => {
  await GetApi()
  let totalReward = await api.query.onlineProfile.erasMachineReleasedReward(EraIndex, MachineId)
  return Number(totalReward.toJSON())
}

// 定义机器信息，避免重复获取，节省时间
let Total_machinesList = []
let updataMachine = []

export const getList = async (wallet, nowDay) => {
  var conn = null;
  try {
    conn = await MongoClient.connect(url);
    console.log("数据 ----> 数据库已连接");
    const test = conn.db("identifier").collection("auditRewardTest");
    let allListedMachine = []
    let j = 0 
    let machinesList =  await leaseCommitteeOps(wallet);
    let list = machinesList.online_machine // 获取当前委员会验证上线的机器
    for(let i = 0; i< list.length; i++){
      // 查询
      var arr = await test.find({machine_id: list[i]}).toArray();
      var arr_id = await test.find({ _id: wallet+list[i] }).toArray();
      if(arr_id.length){ // 判断数据库中是否存在此条数据 存在，就更新，不存在，就新增
        if(updataMachine.indexOf(list[i]) == -1){ // 判断机器是否已经更新过数据
          let reward_length = nowDay - arr[0].online_day - arr[0].reward.length
          if(reward_length > 1){
            let td_reward = await erasMachineReleasedReward( nowDay-1, list[i] ) // 获取该机器当天的收入，未除99
            let today_Reward = td_reward/99/arr[0].info.reward_committee.length // 获取该机器当天的收入，已除99
            let hasreward = arr[0].reward?arr[0].reward:[];
            hasreward.push(td_reward)
            // 获取累计奖励
            let total_reward = hasreward.length&&hasreward.reduce(function(a, b) { 
              return a + b;
            })
            let total_Reward = total_reward/99/arr[0].info.reward_committee.length
            await test.updateMany({ machine_id: list[i] },{ $set: { todayReward: today_Reward, totalReward: total_Reward }, $push:{reward: td_reward } })
            updataMachine.push(list[i])
          }
        }
      }else{ // 数据库中不存在时
        let result = Total_machinesList.findIndex(item=>item.machine_id == list[i]) // 同一台机器是否已获取详细信息
        if(result != -1){ // 以获取，直接赋值
          allListedMachine[j] = Total_machinesList[result]
          allListedMachine[j]._id = wallet+allListedMachine[j].machine_id
          allListedMachine[j].wallet = wallet
        }else{ // 未获取，重新计算
          allListedMachine[j] = await machinesInfo( nowDay - 1, list[i] ) // 通过机器id获取机器详细信息
          allListedMachine[j].reward = []
          allListedMachine[j].online_day = 0
          allListedMachine[j].machine_id = allListedMachine[j].info.machine_info_detail.committee_upload_info.machine_id
          allListedMachine[j].todayReward = allListedMachine[j].todayReward/99/allListedMachine[j].info.reward_committee.length
          // 计算从上线到现在每天的奖励，推出reward数据保存
          allListedMachine[j].online_day = parseInt((allListedMachine[j].info.online_height.replace(',',''))/2880) - 183 // 获取机器第几天上线
          let day = allListedMachine[j].online_day + 1
          while( day < nowDay ){
            allListedMachine[j].reward.push( await erasMachineReleasedReward(day, list[i]) ) // 计算从上线以后每一天的收益
            day ++ 
          }
          // 获取累计奖励
          let reward = allListedMachine[j].reward.length&&allListedMachine[j].reward.reduce(function(a, b) { 
            return a + b;
          })
          allListedMachine[j].totalReward = reward/99/allListedMachine[j].info.reward_committee.length
          Total_machinesList.push(allListedMachine[j])
          allListedMachine[j]._id = wallet+allListedMachine[j].machine_id
          allListedMachine[j].wallet = wallet
        }
        j++
      }
    }
    if(allListedMachine.length){
      await test.insertMany(allListedMachine)
    }
  } catch (err) {
    console.log("错误：" + err);
  } finally {
    if (conn != null) conn.close();
  }
}

const getMachine = async () => {
  let nowDay = await currentEra() 
  let committee = await committeeStake()
  console.log(committee, 'commitList');
  for(let i = 0; i < committee.length; i++){
    await getList(committee[i] , nowDay);
  }
}
getMachine();

export const scheduleCronstyle = () => {
  schedule.scheduleJob('00 00 02 * * *',function(){
    console.log('02');
    Total_machinesList = []
    updataMachine = []
    getMachine();
  });
  schedule.scheduleJob('00 00 10 * * *',function(){
    console.log('10');
    Total_machinesList = []
    updataMachine = []
    getMachine();
  });
  schedule.scheduleJob('00 00 18 * * *',function(){
    console.log('18');
    Total_machinesList = []
    updataMachine = []
    getMachine();
  });
}

scheduleCronstyle();