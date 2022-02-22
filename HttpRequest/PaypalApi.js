import express from 'express'
import mongodb from 'mongodb'
import { mongoUrl, payPalWalletSeed, wssChain, typeJson } from '../publicResource.js'
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import httpRequest from 'request-promise';
import { BN_TEN } from '@polkadot/util';
import BN from 'bn.js'
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;

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

// 确认支付进行转账
Recharge.get('/confirmPayment', async (request, response ,next) => {
  let conn = null
  try {
    let wallet = request.query.wallet
    let orderId = request.query.orderId
    let DBCNum = request.query.DBCNum
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(wallet){
      let VirInfo ={}
      try {
        VirInfo = await httpRequest({
          url: `https://api-m.sandbox.paypal.com/v2/payments/captures/${orderId}`,
          method: "get",
          json: true,
          headers: {
            "content-type": "application/json",
            "Authorization": "Basic QVJqTXNsM3ZKYjRrXzUtczRNZlNSSHpZZ2c0dTJDRWRDS0dtTWQ2UTYxdWdYSnB3UzNwdXRMcF83TDNSck5ESm9feVRUU1Ffa19zV0tTMVA6RU5TSlhhQ05pREJLa1p2Q2hkODVZanYtU1JFQ2FKQXhnZEtKR3Y5bHFxbExXZ0tjWWFhbmFwRENBUnlFMzZUQU1XYkEyMXFaSEJ0NDZremQ="
          },
          body: {}
        })
      } catch (err) {
        VirInfo = {
          message: err.message
        }
      }
      if (VirInfo.name != 'RESOURCE_NOT_FOUND') {
        if (VirInfo.status && VirInfo.status == 'COMPLETED') {
          const paypal = conn.db("identifier").collection("paypalBuyDBC")
          let orderArr = await paypal.find({ _id: String(orderId) }).toArray()
          if (orderArr.length) {
            let orderInfo = orderArr[0]
            if (orderInfo.status == 2) {
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
              _id: orderId,
              wallet: wallet,
              DBCNum: DBCNum,
              status: 1,
              ...VirInfo
            })
            await GetApi()
            const siPower = new BN(15)
            const bob = inputToBn(String(DBCNum), siPower, 15)
            let accountFromKeyring = await keyring.addFromUri(payPalWalletSeed);
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
                    await paypal.updateOne({_id:orderId}, {$set: { status: 2 }})
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