import { ApiPromise, WsProvider } from '@polkadot/api';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import request from 'request-promise';
import { typeJson, wssChain, mongoUrl } from '../publicResource.js'

const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
let api  = null
let conn = null
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

let committeeMachineListInfo = []

/**
 * committeeList 获取验证人列表
 * @param permas
 */
 export const committeeList = async () => {
  await GetApi()
  const commitList = await api.query.committee.committee()
  let list = [...commitList.normal.toHuman(), ...commitList.chill_list.toHuman(), ...commitList.fulfilling_list.toHuman()]
  return list
}

/**
 * machineCommittee 根据机器id查询机器验证状态及何时提交原始信息
 * @param permas
 */
 export const machineCommittee = async (machineId) => {
  await GetApi()
  const info = await api.query.onlineCommittee.machineCommittee(machineId)
  return info.toHuman()
}

/**
 * committeeOps 查询对应机器的验证状态
 * @param permas
 */
 export const committeeOps = async (wallet, machineId) => {
  await GetApi()
  const info = await api.query.onlineCommittee.committeeOps(wallet, machineId)
  return info.toHuman()
}

/**
 * committeeMachine 查询验证人下的机器信息
 * @param permas
 */
 export const committeeMachine = async (wallet) => {
  try {
    await GetApi()
    const infoMachine = []
    const MachineList = await api.query.onlineCommittee.committeeMachine(wallet)
    let list = MachineList.toHuman()
    for (let i = 0; i< list.booked_machine.length; i++) {
      const verification = await machineCommittee(list.booked_machine[i]) // 获取机器的验证状态及提交时间
      const committee = await committeeOps(wallet, list.booked_machine[i]) // 获取机器对应该验证人的时间参数
      let machineInfo = {}
      try {
        machineInfo = await request({
          url: "http://183.60.141.57:5052/api/v1/mining_nodes",
          method: "post",
          json: true,
          headers: {},
          body: {"peer_nodes_list": [list.booked_machine[i]], "additional": {}}
        })
      } catch (err) {
        machineInfo = err.error
      }
      infoMachine.push({
        _id: wallet+list.booked_machine[i],
        wallet: wallet,
        original: machineInfo,
        machine_id: list.booked_machine[i],
        status: 'booked',
        verify_time_high: committee.verify_time,
        HashSize: verification.hashed_committee.length,
        confirm_start_time: verification.confirm_start_time
      })
    }
    for (let i = 0; i< list.hashed_machine.length; i++) {
      const verification = await machineCommittee(list.hashed_machine[i]) // 获取机器的验证状态及提交时间
      const committee = await committeeOps(wallet, list.hashed_machine[i]) // 获取机器对应该验证人的时间参数
      let machineInfo = {}
      try {
        machineInfo = await request({
          url: "http://183.60.141.57:5052/api/v1/mining_nodes",
          method: "post",
          json: true,
          headers: {},
          body: {"peer_nodes_list": [list.hashed_machine[i]], "additional": {}}
        })
      } catch (err) {
        machineInfo = err.error
      }
      infoMachine.push({
        _id: wallet+list.hashed_machine[i],
        wallet: wallet,
        original: machineInfo,
        machine_id: list.hashed_machine[i],
        status: 'hashed',
        verify_time_high: committee.verify_time,
        HashSize: verification.hashed_committee.length,
        confirm_start_time: verification.confirm_start_time
      })
    }
    for (let i = 0; i< list.confirmed_machine.length; i++) {
      const verification = await machineCommittee(list.confirmed_machine[i]) // 获取机器的验证状态及提交时间
      const committee = await committeeOps(wallet, list.confirmed_machine[i]) // 获取机器对应该验证人的时间参数
      let machineInfo = {}
      try {
        machineInfo = await request({
          url: "http://183.60.141.57:5052/api/v1/mining_nodes",
          method: "post",
          json: true,
          headers: {},
          body: {"peer_nodes_list": [list.confirmed_machine[i]], "additional": {}}
        })
      } catch (err) {
        machineInfo = err.error
      }
      infoMachine.push({
        _id: wallet+list.confirmed_machine[i],
        wallet: wallet,
        original: machineInfo,
        machine_id: list.confirmed_machine[i],
        status: 'confirm',
        verify_time_high: committee.verify_time,
        HashSize: verification.hashed_committee.length,
        confirm_start_time: verification.confirm_start_time
      })
    }
    return infoMachine
  } catch (err) {
    console.log(err, 'committeeMachine')
  }
}

const getMachine = async () => {
  try {
    let committee = await committeeList()
    console.log(committee, 'commitList');
    for(let i = 0; i < committee.length; i++){
      let info = await committeeMachine(committee[i]);
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const test = conn.db("identifier").collection("auditListTest")
      await test.deleteMany({ wallet: committee[i] })
      info && await test.insertMany(info)
    }
  } catch (err) {
    console.log(err, 'getMachine')
  }
}
getMachine();

export const scheduleCronstyle = () => {
  schedule.scheduleJob('00 30 * * * *',function(){
    getMachine();
  });
}

scheduleCronstyle();