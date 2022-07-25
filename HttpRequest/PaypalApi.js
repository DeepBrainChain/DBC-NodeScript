import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
import { mongoUrlSeed, wssChain, typeJson, paypalUrl, walletInfo } from '../publicResource.js'
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api';
import httpRequest from 'request-promise';
import { BN_TEN } from '@polkadot/util';
import BN from 'bn.js'
import { decryptByAes256 } from '../testScript/crypto.js'
import AlipaySdk from 'alipay-sdk';
import AliPayForm from 'alipay-sdk/lib/form.js';
const mongoUrl = decryptByAes256(mongoUrlSeed)
const walletTransfer = JSON.parse(decryptByAes256(walletInfo))
// 链接数据库
const MongoClient = mongodb.MongoClient;
const url = mongoUrl;
const urlEcode = bodyParser.json()

// 支付宝SDK - sandbox
const alipaySdk = new AlipaySdk.default({
  appId: '2021000121601209',
  signType: 'RSA2',
  gateway: 'https://openapi.alipaydev.com/gateway.do',
  alipayPublicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAj+jB/RyAoBoeju9SgEgRJgursWgcfEaLbk9kqV2WIXUYu2kyAV7W9aEB884K9wmMmWlFg/elhW08XlWItP/96nmfpu1GvyBgoTNvHJhDX2asuqGffbSS+kK/AJ+ffQj4IN8X5QslpdoLdzS8mhD1r+ZiHysyeocB6terun0Mx0+Wuk4VjcNuyXWeygaUF8Ie9tFr8aLJbPTJEoPxF+iXxb56wV1bpdmaBO1+O5Ol3EGSNzTlxUKIofoWPmbv/N0xtesSmoKMLfSv/xyb0yR6K0dn0Yl5uZMu5DeLReFzDeQixM7PBU5hj7DIYiT3WDxlxslQpBf2fzieOsbusr76twIDAQAB',
  privateKey: 'MIIEpQIBAAKCAQEAwjDSHw2cA86SU3cNY3KKNID/QGSzhXg3z5tNhWaYF4faZIsQJ92N6T6tmuFCj783ucgHu7Fg0o1Z69rsHFwBEpkl6tEjfS90/wodtpTVyF4CvUP6kd1uyqIGw+nbKNVY1rfjFZCCCJYsyYcea8ttyU3BAiG4NU1Fo3v3sM7874t0umroPQBw54Sr8P99DGkLw9ec5dUddVovbmMpQcVBgisliJ69AL74OaU8foHoifmJSplktQpPFn7gP4LiVOw1gt4pWJR5b8zeVwXE83IwB7bEqleCVah1x+4AygcAvw9GIFrkRZ3mZaI/U2VGpxd7Jtdf6HSA4qUQlrTZxyZvGQIDAQABAoIBAFnkw8BASpKwk6gzmm0I3tWDSaYDd983UY63c+FnJsztxLl6bpYlx8XLkA38bRWiDSfhY0MNz6ZobNHz3A0cwhpb7uOOwQD4cQ6HHk4hA/3nFxmKWHohqWIAM2WJ4jw61w8+vM6EwM08x6ra88guubnQVqKn/WAfTzdo8bZVe11fvuTVJ38osU2ZhG5En+de6bSfZHiyPmiSVOEpoxpzNI66P1AXWT1Je1XO+bN+aV5mZTsS2D4XVa16yCyWC5RZlzUaeRE+9oOznd4rVpJ7U2th3yHwkO81+9kUBsWvoaYyyhULXQ06x1eUlpmbSZ3O6OWezW3fmsrv0H9fOCmMzkkCgYEA/4+iZY7flZKdbGPS7wEpYbx4n8yVzDnvRdFjp1mpdPwbkrszfimzyZAMaJmGeZrKWoieanA6YZ+Ncd5Dx+liZ63ebk2H051FLtaJCaC2yQM9YsPnfhmNeZEBQKG4toCK9B0xzV68PqAXEwXxEpEdT8MR/iiYiaMiQM0GZAIV9HsCgYEAwoYz9eTBjRbxUsI95witM1tj1wHvUDIcx2RW11oOaEcWdW81ZeuxyDYKcdIuRmgskeUZi/kKSd+kI72GhfQ2HfkIdFDmrXY7MBpSzd863yN7eIQrCOlVzs7H5L+Ib2y0R/SRJjiDv+KbCRRg4urab4hcoyPpU47gS6bIgSNYaHsCgYEA2e9TPegpIxR0ywoVx1vmPkLLWvrMg+yj75YwtXXw3KJhoS+jKePGPg1ph4nk867dAXegIIS0RKwbow84HjMYh/HtzYKwYfWsGdU558v2FFV+88q8jvybeR//QW6oZnoYBTUgU1KGlaFQDBj1DDBUHsDrhyJ3cmh7vWcaHA7rSiECgYEAvcvDlwAD+W2ROHZdf7Zvh9R7raUtosnCWqoEMUqlFAmIWDyRlUhKxlY0CqpQjFHIavFl47Sx3TJgLJ8XSkvlIYmCPjtRV54sUdrdQBG2l1E/f281rhQ8rPQFBaP7svwVSr/Nf8VUhzzKmClR/xW222vpNyQq3GRjZGzu5VFfSVECgYEAyZ+ODhsl67c1Y2/W6H0ffavHHcGN5rLF0Cp8AaX7IDee1jPg+Tb5lXFn3VQ9sbBBJ7paCyvj3TOwHE189GrVuC8M+r0bz7xsFerzDpOnspd+eBbNZl/hCLX06pPP3CS/kwrptB2Y3o/0it8zrXq5SAGRFvpYe4rlMqDK/idbtFg=',
});

// 支付宝SDK - product
// const alipaySdkPro = new AlipaySdk.default({
//   appId: '2021003141699069',
//   signType: 'RSA2',
//   gateway: 'https://openapi.alipay.com/gateway.do',
//   alipayPublicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAofRR2sdt+85jSBOHhUax7E5CRJjAGj/9zoW0TLz4QGziXwoPwMfwwQlFNLNmW2VTboTi9fKH60nnMBw1TRlRuuN4/EUzpI0lUdrrsKplcDAumYKJvPj1USkUkxdrhdfIOcE+smhdYpU5a14flkZ1nOVb3eXY3YIxZBRQeYPcavvu69sI7GcDZ/KcHVLtnIKi7+2I7gkqW2hGMT5a9D9V3WAPhwMH81ag6Jf4FRrfIM4qhDol2dmAIxjH4ux3qsRNXd/Ku8fjIQCzomaDh6LhYctUCwkYiHVuuMp863gnxcBM9ME8mLI995QLAiglEWpMuiZ5N2D8oGNMtyLc1W9tiwIDAQAB',
//   privateKey: 'MIIEowIBAAKCAQEAofRR2sdt+85jSBOHhUax7E5CRJjAGj/9zoW0TLz4QGziXwoPwMfwwQlFNLNmW2VTboTi9fKH60nnMBw1TRlRuuN4/EUzpI0lUdrrsKplcDAumYKJvPj1USkUkxdrhdfIOcE+smhdYpU5a14flkZ1nOVb3eXY3YIxZBRQeYPcavvu69sI7GcDZ/KcHVLtnIKi7+2I7gkqW2hGMT5a9D9V3WAPhwMH81ag6Jf4FRrfIM4qhDol2dmAIxjH4ux3qsRNXd/Ku8fjIQCzomaDh6LhYctUCwkYiHVuuMp863gnxcBM9ME8mLI995QLAiglEWpMuiZ5N2D8oGNMtyLc1W9tiwIDAQABAoIBAHGV9ULH1C9i1ObcK5QhvO/LA1cw+qpubwfFZmrbrhEhTLLzT5EZqZT5d3w6xnMbYaSFtthgPUucDXUEk617MIMuvs/PiSTDiYUbUWoaWAKTCFvJ3eiXgxZlBXUUW+kHKfq3uc1OvRBDMH5JCUZQLHTZt9CtP6g7g4B5bueKv7CX2ref1J1wR7+IdOHOXDM6quWyA3j9nAgwvij5Yr+YHoyc+eb0rM/BAbK/MKaseyzqpWRkunKTXMo/+A4ysNraldnaydz12A8+KDuDAAmQqzmGS4vLxejBYux1PTu9O99fHITyNVVlSrQdse5mZMGWLQ40BJBqLxUsHltOplOPWWECgYEA3IB/8+X2LaVESToGMQurTG6ldi6IP7b9p6UYDXW85FdJmyshtYiw3A0sQt9892i9gJrcY/03sQCh+pSCJTMqenrJY/3hHSlL+fHoUhlF1Ul+HCs8jFkarE5fmx0Ij36J24ghHkh9iqFrAWLpVmeY7eLAV83i8bS45koOo0BGeJcCgYEAvAbpN2S9Zh/7Oea8He92o2Kqg7oVfCG/+gju1M6g7jYcelomf1PHpWx9+rrKS6bVdRhW4TYXduGbkhQZAvg3dg0Is6XdY3JnCzf+bfVG5fE3jsriK5sHjT/Xvyh+TPlgwAtMc1/DhrSNH2MuZJL9ENfLQjQNvZLpzokqlU/5/S0CgYADh4cEx2SGXIPYTDZ3KIGoaoj5eEs0AeDTgx/8bysD2KXT9v/GIRb7nrZbp6ofZ6zI1zG54/61NZZiJWhj4grHBRoeIJ0u009lA8s9LSxh+pgrKUIB2RdFNMfw+qj9awAX5HjrPCvOQUEuN4AWovferud3QFNmnQbsoLjVQh0epwKBgQCF8uZx7/J9rorq1NVu/gkmnEOdVBO6OtDo7zQ1pn4/NY1UHKUQUD8KOiAFXsx+2Ht4z74U8tQEfPS3PFoVI39fOinY0XDGR9ngxCMdcn7vkMhjkWVOa0MV/UVViSNw8rdaGLJ9/trsO/PNSHrka1KdjR3gK/Ud+GtYF5+efzs4gQKBgB8UPx/eCiwXVGqIk3Pl3kWvbc9znx1uGtPcE7q/3IHSOVISflLDOby+S2TkLGELXZ3RZioeq4X1cdMTpYeX+93DY/pTdM0zcI2rILwzl0YzJxb7goH0mojN6JeSisKl3BLzNtlojr3nwS9A9cwlukgtZHUDODaryWkRzQv8KYhk',
// });

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
  const rmb = request.body.rmb
  const wallet = request.body.wallet
  const dbcPrice = await dbcPriceOcw()
  const dbcnowPrice = dbcPrice/1000000
  try {
    conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    // const walletCon = conn.db("identifier").collection("contractwallet")
    // let walletArr = await walletCon.find({ _id: 'contractwallet' }).toArray()
    // let walletInfo = walletArr[0]
    const balance = await getbalance(walletTransfer.wallet)
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
        await orderInfo.updateOne({_id: orderId}, {$set: {usd: usd, dbc: dbcNum, rmb: rmb}})
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
            // const walletCon = conn.db("identifier").collection("contractwallet")
            // let walletArr = await walletCon.find({ _id: 'contractwallet' }).toArray()
            // let walletInfo = walletArr[0]
            let orderArr = await paypal.find({ _id: String(payId)}).toArray()
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
              let accountFromKeyring = await keyring.addFromUri(walletTransfer.seed);
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

// 支付宝支付
Recharge.post('/createPayByAli', urlEcode, async (request, response, next) => {
  const { money, orderId, wallet } = request.body
  const formData = new AliPayForm.default();
  // 调用 setMethod 并传入 get，会返回可以跳转到支付页面的 url
  formData.setMethod('get');
  // notifyUrl：消息回调的接口，当付款成功，支付宝会发送成功信息到我们的项目当中，告诉我们付款成功了，即我们项目自己定义的接口，需要公网能够访问到的地址，即**项目要上线。**如果是自己本地的测试项目，可以配置内网穿透。
  // returnUrl：付款成功之后，页面会自动跳转，returnUrl就表示这个跳转的地址。
  // formData.addField('notifyUrl', 'http://www.com/notify');
  formData.addField('returnUrl', `http://8.219.75.114:64433/trade/buy_4?order_id=${orderId}&address_user=${wallet}&payType=zfb`);  
  // const outTradeNo = createOrder()
  formData.addField('bizContent', {
    outTradeNo: orderId, // 商户网站唯一订单号
    productCode: 'FAST_INSTANT_TRADE_PAY', // FAST_INSTANT_TRADE_PAY
    timeout: '30m', // 设置未付款支付宝交易的超时时间，一旦超时，该笔交易就会自动被关闭。
    totalAmount: money, // 订单总金额，单位为元，精确到小数点后两位，取值范围[0.01,100000000]
    subject: 'Buy DBC', // 商品的标题
    body: 'When buying DBC, please pay attention to whether the wallet address is correct', // 对一笔交易的具体描述信息
  });
  
  const result = await alipaySdk.exec(
    'alipay.trade.page.pay',
    {},
    { formData: formData },
  );
  
  // result 为可以跳转到支付链接的 url
  response.json({
    success: true,
    code: 10001,
    msg: '创建支付订单成功',
    content: {
      orderId,
      result
    }
  })
})

// 检查支付宝 是否支付成功
Recharge.post('/checkPayByAli', urlEcode, async (request, response, next) => {
  let conn = null
  try {
    const { orderId , wallet} = request.body
    const formData = new AliPayForm.default();
    // 调用 setMethod 并传入 get，会返回可以跳转到支付页面的 url
    formData.setMethod('get');
    formData.addField('bizContent', {
      outTradeNo: orderId, // 商户网站唯一订单号
    });
    const result = await alipaySdk.exec(
      'alipay.trade.query',
      {},
      { formData: formData },
    );
    let taskinfo ={}
    try {
      taskinfo = await httpRequest({
        url: result,
        method: "get"
      })
    } catch (err) {
      taskinfo = {
        message: err.message
      }
    }
    if (taskinfo[taskinfo.length-1] == '}') {
      taskinfo = JSON.parse(taskinfo)
    }
    // WAIT_BUYER_PAY（交易创建，等待买家付款）、TRADE_CLOSED（未付款交易超时关闭，或支付完成后全额退款）
    // TRADE_SUCCESS（交易支付成功）、TRADE_FINISHED（交易结束，不可退款）
    const payResult = taskinfo.alipay_trade_query_response
    if (payResult.trade_status === 'TRADE_SUCCESS') {
      conn = await MongoClient.connect(url, { useUnifiedTopology: true })
      const DBCOder = conn.db("identifier").collection("buyDBCorder")
      let odArr = await DBCOder.find({_id: orderId}).toArray()
      let odArrinfo = odArr[0]
      if (odArrinfo.rmb != payResult.total_amount) {
        response.json({
          success: false,
          code: -7,
          msg: '查询订单金额与转账金额不一致，请联系客服处理',
          content: payResult
        })
      } else {
        const paypal = conn.db("identifier").collection("paypalBuyDBC")
        let orderArr = await paypal.find({ _id: String( payResult.trade_no )}).toArray()
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
            _id: payResult.trade_no,
            orderId: orderId,
            wallet: wallet,
            DBCNum: odArrinfo.dbc,
            paystatus: 1,
            ...payResult
          })
          await GetApi()
          const siPower = new BN(15)
          const bob = inputToBn(String(odArrinfo.dbc), siPower, 15)
          let accountFromKeyring = await keyring.addFromUri(walletTransfer.seed);
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
                    content: payResult
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
                  await paypal.updateOne({_id: payResult.trade_no}, {$set: { paystatus: 2 }})
                  response.json({
                    success: true,
                    code: 10001,
                    msg: '转账成功，请查收',
                    content: payResult
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
