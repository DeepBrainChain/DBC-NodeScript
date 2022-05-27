import { ApiPromise, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import { typeJson, wssChain, mongoUrlSeed } from '../publicResource.js'

import { decryptByAes256 } from '../testscript/crypto.js'
const mongoUrl = decryptByAes256(mongoUrlSeed)
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
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
var conn = null;
export const getList = async (wallet, nowDay) => {
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true });
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
          // allListedMachine[j].online_day = parseInt((allListedMachine[j].info.online_height.replace(',',''))/2880) - 183 // 获取机器第几天上线
          allListedMachine[j].online_day = parseInt((allListedMachine[j].info.online_height.replace(',',''))/2880) // 获取机器第几天上线
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
    if (conn != null){
      conn.close()
      conn = null
    }
  }
}

const firstRun = async () => {
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    console.log(" firstRun ----> 数据库已连接");
    const test = conn.db("identifier").collection("auditRewardTest");
    await test.deleteMany({})
  } catch (err) {
    console.log("firstRun错误：" + err);
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
}

const getMachine = async () => {
  let nowDay = await currentEra() 
  let committee = await committeeStake()
  for(let i = 0; i < committee.length; i++){
    await getList(committee[i] , nowDay);
  }
}
firstRun();
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