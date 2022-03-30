import { ApiPromise, WsProvider } from '@polkadot/api';
import { hexToString } from '@polkadot/util';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import httpRequest from 'request-promise';
import { typeJson, CTtypeJson, wssChain, mongoUrl, baseUrl } from '../publicResource.js'

const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
let api  = null
let congtuapi  = null
let conn = null
// 测试链上交互
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
// 聪图链上交互
export const GetApi2 = async () =>{
  if (!congtuapi) {
    const provider = new WsProvider(wssChain.congtuDbc)
    congtuapi = await ApiPromise.create({ 
      provider ,
      types: CTtypeJson
    })
  }
  return { congtuapi }
}


/**
 * liveMachine 获取两条链上机器所有可用机器信息（online_machine， rented_machine， offline_machine）
 * @param permas
 */
 export const liveMachine = async () => {
  await GetApi()
  await GetApi2()
  const machine = await api.query.onlineProfile.liveMachines()
  const machine2 = await congtuapi.query.onlineProfile.liveMachines()
  // console.log(machine2, 'machine2');
  let list = [...machine.online_machine.toHuman(), ...machine.rented_machine.toHuman(), ...machine.offline_machine.toHuman()]
  let list2 = [...machine2.online_machine.toHuman(), ...machine2.rented_machine.toHuman(), ...machine2.offline_machine.toHuman()]
  const newList = [...list, ...list2]
  return newList
}

/**
 * machineInfo 获取链上机器单独机器的详细信息
 * @param permas
 */
 export const machineInfo = async (machineId) => {
  let info = null
  if (machineId.indexOf('CTCCTC') != -1) {
    await GetApi2()
    info = await congtuapi.query.onlineProfile.machinesInfo(machineId)
  } else {
    await GetApi()
    info = await api.query.onlineProfile.machinesInfo(machineId)
  }
  return info.toJSON()
}

function flatObject(target) {
  const result = {};
  for (let key in target) {
    const value = target[key];
    if (key !== 'machine_status') {
      Object.assign(
          result,
          Object.prototype.toString.call(value) === '[object Object]'
              ? flatObject(value)
              : { [key]: value }
      );
    } else {
      Object.assign(
        result, { [key]: Object.keys(value)[0] }
      );
    }
  }
  return result;
}

const getMachine = async () => {
  try {
    let list = await liveMachine()
    if (list.length) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const machineConn = conn.db("identifier").collection("machineInfo")
      let machineArr_add = []
      for(let i = 0; i < list.length; i++){
        let VirInfo = {}
        if (list[i] != '') {
          const info = await machineInfo(list[i]);
          // East 东 West 西 South 南 North 北   lat 纬度 lng 经度
          // 南纬是负，北纬是正，东经是正，西经是负。
          const MachineInfo = flatObject(info)
          MachineInfo.gpuType = hexToString(MachineInfo.gpu_type)
          MachineInfo.cpuType = hexToString(MachineInfo.cpu_type)
          delete MachineInfo.cpu_type
          delete MachineInfo.gpu_type
          const machineFindArr = await machineConn.find({_id: MachineInfo.machine_id}).toArray()
          if (machineFindArr.length) {
            await machineConn.updateOne({_id: MachineInfo.machine_id}, {$set: MachineInfo})
          } else {
            const lng = MachineInfo['east'] ? (MachineInfo['east'] / Math.pow(10, 4)) : -(MachineInfo['west'] / Math.pow(10, 4));
            const lat = MachineInfo['north'] ? (MachineInfo['north'] / Math.pow(10, 4)) : -(MachineInfo['south'] / Math.pow(10, 4));
            const string = lat+','+lng
            try {
              VirInfo = await httpRequest({
                url: `https://api.map.baidu.com/reverse_geocoding/v3/?ak=jQc7i76SLm2k5j54z5y6ppjWjhb0nlhC&output=json&coordtype=wgs84ll&location=${string}`,
                method: "get",
                json: true
              })
            } catch (err) {
              VirInfo = {
                message: err.message
              }
            }
            if (VirInfo.status == 0) {
              MachineInfo.country = VirInfo.result.addressComponent.country
              MachineInfo.city = VirInfo.result.addressComponent.city
              MachineInfo.address = VirInfo.result.formatted_address
            } else {
              MachineInfo.country = ''
              MachineInfo.city = ''
              MachineInfo.address = ''
            }
            MachineInfo._id = MachineInfo.machine_id
            machineArr_add.push(MachineInfo)
          }
        }
      }
      if (machineArr_add.length != 0) {
        await machineConn.insertMany(machineArr_add)
      }
    }
  } catch (err) {
    console.log(err, 'getMachine')
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  }
}
getMachine();

export const scheduleCronstyle = () => {
  schedule.scheduleJob('00 50 * * * *',function(){
    getMachine();
  });
  schedule.scheduleJob('00 40 * * * *',function(){
    getMachine();
  });
  schedule.scheduleJob('00 30 * * * *',function(){
    getMachine();
  });
  schedule.scheduleJob('00 20 * * * *',function(){
    getMachine();
  });
  schedule.scheduleJob('00 10 * * * *',function(){
    getMachine();
  });
  schedule.scheduleJob('00 01 * * * *',function(){
    getMachine();
  });
}

scheduleCronstyle();