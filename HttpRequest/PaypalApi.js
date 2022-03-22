import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { mongoUrl, wssChain, typeJson, paypalUrl } from '../publicResource.js'
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import httpRequest from 'request-promise';
import { BN_TEN } from '@polkadot/util';
import BN from 'bn.js'
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
const urlEcode = bodyParser.json()

// 定义路由
export const Recharge = express.Router()

// 链上交互
let api  = null
const keyring = new Keyring({type: 'sr25519'})
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

// 订单号生成
const createOrder = () => {
  let str = "",
  arr = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
  'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z','0', '1', '2', '3', '4', '5', '6', '7', '8', '9',];
  
  for (let i = 0; i < 16; i++) {
    let pos = Math.round(Math.random() * (arr.length - 1));
    str += arr[pos];
  }
  return str;
}

/**
 * dbcPriceOcw 获取链上DBC的实时价格
 */
 export const dbcPriceOcw = async () => {
  await GetApi();
  let de = await api.query.dbcPriceOcw.avgPrice();
  return de.toJSON()
}

/**
 * getbalance 查询钱包的余额
 * @param permas
 */
 export const getbalance = async (wallet) => {
  await GetApi()
  const data = await api.query.system.account(wallet)
  const balance = data.toJSON();
  return balance.data.free / Math.pow(10, 15)
}

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
  } else {
    result = new BN(input.replace(/[^\d]/g, ''))
      .mul(BN_TEN.pow(siPower));
  }
  return result
}

// 创建交易订单，用于确认支付金额
Recharge.post('/createOrder', urlEcode, async (request, response ,next) => {
  let conn = null
  const order_id = request.body.order_num
  const usd = request.body.usd
  const wallet = request.body.wallet
  const dbcPrice = await dbcPriceOcw()
  const dbcnowPrice = dbcPrice/1000000
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const walletCon = conn.db("identifier").collection("contractwallet")
    let walletArr = await walletCon.find({ _id: 'contractwallet' }).toArray()
    let walletInfo = walletArr[0]
    const balance = await getbalance(walletInfo.wallet)
    if (usd) {
      let orderId = null
      const orderInfo = conn.db("identifier").collection("buyDBCorder")
      if (order_id) {
        orderId = order_id
      } else {
        orderId = createOrder()
        await orderInfo.insertOne({
          _id: orderId,
          wallet: wallet
        })
      }
      const useUSD = usd*0.86 - 0.3
      const dbcNum = Math.ceil(useUSD/dbcnowPrice)
      if (dbcNum > balance) {
        response.json({
          code: -3,
          msg: '智能合约钱包余额不足，请重新输入购买金额',
          success: false
        })
      } else {
        await orderInfo.updateOne({_id: orderId}, {$set: {usd: usd, dbc: dbcNum}})
        let odArr = await orderInfo.find({_id: orderId}).toArray()
        response.json({
          code: 10001,
          msg: '查询成功',
          success: true,
          content: odArr[0]
        })
      }
    } else {
      response.json({
        code: -2,
        msg: '金额不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})

// 确认支付进行转账
Recharge.get('/confirmPayment', async (request, response ,next) => {
  let conn = null
  try {
    let wallet = request.query.wallet
    let orderId = request.query.orderId
    let payId = request.query.payId
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    const paypaldetails = await conn.db("identifier").collection("paypalInfo")
    const paypalArr = await paypaldetails.find({ _id: 'paypal' }).toArray()
    const paypalInfo = paypalArr[0]
    const paypalauth = new Buffer.from(`${paypalInfo.Client_ID}:${paypalInfo.Secret}`)
    const basicAuth = paypalauth.toString('base64')
    if(wallet){
      let VirInfo ={}
      try {
        VirInfo = await httpRequest({
          url: paypalUrl+ `/v2/payments/captures/${payId}`,
          method: "get",
          json: true,
          headers: {
            "content-type": "application/json",
            "Authorization": `Basic ${basicAuth}`
          },
          body: {}
        })
      } catch (err) {
        VirInfo = {
          message: err.message
        }
      }
      if (VirInfo.name != 'RESOURCE_NOT_FOUND') {
        if (VirInfo.status && (VirInfo.status == 'COMPLETED' || VirInfo.status == 'PENDING')) {
          const DBCOder = conn.db("identifier").collection("buyDBCorder")
          let odArr = await DBCOder.find({_id: orderId}).toArray()
          let odArrinfo = odArr[0]
          if (odArrinfo.usd != VirInfo.amount.value) {
            response.json({
              success: false,
              code: -7,
              msg: '查询订单金额与转账金额不一致，请联系客服处理',
              content: VirInfo
            })
          } else {
            const paypal = conn.db("identifier").collection("paypalBuyDBC")
            const walletCon = conn.db("identifier").collection("contractwallet")
            let walletArr = await walletCon.find({ _id: 'contractwallet' }).toArray()
            let walletInfo = walletArr[0]
            let orderArr = await paypal.find({ _id: String(payId) }).toArray()
            if (orderArr.length) {
              let orderInfo = orderArr[0]
              if (orderInfo.paystatus == 2) {
                response.json({
                  success: true,
                  code: 10002,
                  msg: '已转账，请勿重复操作',
                  content: orderInfo
                })
              } else {
                response.json({
                  success: false,
                  code: -5,
                  msg: '转账失败，请联系客服处理',
                  content: orderInfo
                })
              }
            } else {
              await paypal.insertOne({
                _id: payId,
                orderId: orderId,
                wallet: wallet,
                DBCNum: odArrinfo.dbc,
                paystatus: 1,
                ...VirInfo
              })
              await GetApi()
              const siPower = new BN(15)
              const bob = inputToBn(String(odArrinfo.dbc), siPower, 15)
              let accountFromKeyring = await keyring.addFromUri(walletInfo.seed);
              await cryptoWaitReady();
              await api.tx.balances
              .transfer( wallet, bob )
              .signAndSend( accountFromKeyring , ( { events = [], status , dispatchError  } ) => {
                if (status.isInBlock) {
                  events.forEach( async ({ event: { method, data: [error] } }) => {
                    if (error.isModule && method == 'ExtrinsicFailed') {
                      response.json({
                        success: false,
                        code: -6,
                        msg: '转账失败，请联系客服处理',
                        content: VirInfo
                      })
                      if (conn != null){
                        conn.close()
                        conn = null
                      }
                    }else if(method == 'ExtrinsicSuccess'){
                      if (conn == null) {
                        conn = await MongoClient.connect(url, { useUnifiedTopology: true })
                      }
                      const paypal = conn.db("identifier").collection("paypalBuyDBC")
                      await paypal.updateOne({_id:payId}, {$set: { paystatus: 2 }})
                      response.json({
                        success: true,
                        code: 10001,
                        msg: '转账成功，请查收',
                        content: VirInfo
                      })
                      if (conn != null){
                        conn.close()
                        conn = null
                      }
                    }
                  });
                }
              })
            }
          }
        } else {
          response.json({
            code: -4,
            msg:'支付状态有误，如已扣款，请联系管理员',
            success: false
          })
        }
      } else {
        response.json({
          code: -3,
          msg:'未查询支付信息',
          success: false
        })
      }
    }else{
      response.json({
        code: -2,
        msg:'钱包地址不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -1,
      msg:error.message,
      success: false
    })
  } finally {
    if (conn != null){
      conn.close()
      conn = null
    }
  } 
})