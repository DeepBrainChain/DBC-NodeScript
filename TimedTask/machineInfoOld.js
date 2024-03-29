import { ApiPromise, WsProvider } from '@polkadot/api';
import { hexToString } from '@polkadot/util';
import mongodb from 'mongodb'
import schedule from 'node-schedule'
import httpRequest from 'request-promise';
import { typeJson, wssChain, mongoUrlSeed, baseUrl } from '../publicResource.js'

import { decryptByAes256 } from '../testScript/crypto.js'
const mongoUrl = decryptByAes256(mongoUrlSeed)
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
let api  = null
let conn = null
let conn1 = null
// 测试链上交互
export const GetApi = async () =>{
  if (!api) {
    const provider = new WsProvider(wssChain.dbc)
    api = await ApiPromise.create({ 
      provider,
      types: typeJson
    })
  }
  return { api }
}

const getBlockTime = async (type) => {
  let de = null;
  await GetApi()
  de = await api.query.system.number();
  return de.toJSON();
}

/**
 * liveMachine 获取两条链上机器所有可用机器信息（online_machine， rented_machine， offline_machine）
 * @param permas
 */
 export const liveMachine = async () => {
  await GetApi()
  const machine = await api.query.onlineProfile.liveMachines()
  let list = [...machine.online_machine.toHuman(), ...machine.rented_machine.toHuman()]
  return list
}

/**
 * machineInfo 获取链上机器单独机器的详细信息
 * @param permas
 */
 export const machineInfo = async (machineId) => {
  let info = null
  await GetApi()
  info = await api.query.onlineProfile.machinesInfo(machineId)
  info = info.toJSON()
  info.original_id = machineId
  return info
}

export const getMacStach = async (wallet) => {
  let stachname = ''
  await GetApi()
  let Stainfo = await api.query.identity.identityOf(wallet)
  Stainfo = Stainfo.toJSON()
  if (Stainfo && Stainfo.info) {
    stachname = Stainfo.info.display.raw.indexOf('0x') == -1 ? Stainfo.info.display.raw : hexToString(Stainfo.info.display.raw)
  } else {
    stachname = undefined
  }
  return stachname
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

function getArrEqual(arr1, arr2) {
  let newArr = arr1.filter(item => !(arr2.some(value => value == item)))
  return newArr;
}

const getMachine = async () => {
  try {
    let list = await liveMachine()
    if (list.length) {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const machineConn = conn.db("identifier").collection("MachineDetailsInfo")
      let machineArr_add = []
      let hasMachine = await machineConn.aggregate([{$group:{_id: '$machine_id'}}]).toArray()
      let machineArr_has = hasMachine.map(el => {
        return el._id
      })
      let newMachineArr = getArrEqual(machineArr_has, list)
      for (let k = 0; k< newMachineArr.length; k++) {
        await machineConn.deleteOne({_id: newMachineArr[k]})
      }
      for(let i = 0; i < list.length; i++){
        let VirInfo = {}
        if (list[i] != '') {
          const info = await machineInfo(list[i]);
          // East 东 West 西 South 南 North 北   lat 纬度 lng 经度
          // 南纬是负，北纬是正，东经是正，西经是负。
          const MachineInfo = flatObject(info)
          MachineInfo.gpuType = hexToString(MachineInfo.gpu_type)
          MachineInfo.cpuType = hexToString(MachineInfo.cpu_type)
          MachineInfo.machine_name = await getMacStach(MachineInfo.machine_stash)
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
const getvirMachine = async () => {
  // 获取添加到租用虚拟机的机器
  try {
    conn1 = await MongoClient.connect(url, { useUnifiedTopology: true })
    const virMachine = conn1.db("identifier").collection("virMachine")
    const test = conn1.db("identifier").collection("MachineDetailsInfo")
    const virMacInfo = conn1.db("identifier").collection("virMachineInfo")
    const virArr = await virMachine.find({'_id': 'virtual_machine_list'}).toArray()
    const vir_machinelist = virArr[0] ? virArr[0].machineList : []
    if (vir_machinelist.length) {
      for (let i= 0; i< vir_machinelist.length; i++) {
        let block = await getBlockTime('chain')
        const EndTime = Math.floor((vir_machinelist[i].rent_end - block)/2/60)
        let virinfo = await virMacInfo.find({_id: vir_machinelist[i].machine_id}).toArray()
        let infoArr = await test.find({ _id: vir_machinelist[i].machine_id }).project({ _id: 0 }).toArray()
        if (virinfo.length) {
          let gpuNum = {}
          let canuseGpu = 0
          try {
            gpuNum = await httpRequest({
              url: baseUrl + "/api/v1/mining_nodes",
              method: "post",
              json: true,
              headers: {},
              body: {
                "peer_nodes_list": [vir_machinelist[i].machine_id], 
                "additional": {
                  
                }
              }
            })
          } catch (err) {
            gpuNum = {
              message: err.message
            }
          }
          if (gpuNum&&gpuNum.errcode == 0) {
            if (gpuNum.netcongtu || gpuNum.mainnet) {
              if (vir_machinelist[i].machine_id.indexOf('CTC') != -1) {
                gpuNum = newsession.netcongtu
              } else {
                gpuNum = newsession.mainnet
              }
            } else {
              gpuNum = gpuNum
            }
            let getgpu = gpuNum.message.gpu
            canuseGpu = getgpu.gpu_count - getgpu.gpu_used
          } else {
            canuseGpu = virinfo[0].canuseGpu
          }
          await virMacInfo.updateOne({ _id: vir_machinelist[i].machine_id }, { $set: { EndTime: EndTime, canuseGpu: canuseGpu, ...vir_machinelist[i], ...infoArr[0] }})
        } else {
          await virMacInfo.insertOne({
            _id: vir_machinelist[i].machine_id,
            canuseGpu: infoArr[0].gpu_num,
            ...vir_machinelist[i],
            EndTime: EndTime, 
            ...infoArr[0]
          })
        }
      }
    }
    
  } catch (error) {
    console.log(error, 'getvirMachine')
  } finally {
    if (conn1 != null){
      conn1.close()
      conn1 = null
    }
  }
}

getMachine();
getvirMachine();

export const scheduleCronstyle = () => {
  schedule.scheduleJob('00 50 * * * *',function(){
    getMachine();
    getvirMachine();
  });
  schedule.scheduleJob('00 40 * * * *',function(){
    getMachine();
    getvirMachine();
  });
  schedule.scheduleJob('00 30 * * * *',function(){
    getMachine();
    getvirMachine();
  });
  schedule.scheduleJob('00 20 * * * *',function(){
    getMachine();
    getvirMachine();
  });
  schedule.scheduleJob('00 10 * * * *',function(){
    getMachine();
    getvirMachine();
  });
  schedule.scheduleJob('00 01 * * * *',function(){
    getMachine();
    getvirMachine();
  });
}

scheduleCronstyle();