import express from 'express'
import mongodb from 'mongodb'
import bodyParser from 'body-parser'
// 链接数据库
const MongoClient = mongodb.MongoClient;
// const url = "mongodb://dbc:dbcDBC2017xY@localhost:27017/identifier";
const url = "mongodb://localhost:27017/identifier";

const urlEcode = bodyParser.json()
// 定义路由
export const getAuditList = express.Router()

// 获取用户审核列表
getAuditList.get('/getAuditList', async (request, response ,next) => {
  try {
    let wallet = request.query.wallet
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(wallet){
      const test = conn.db("identifier").collection("auditListTest")
      let total = await test.find({wallet: wallet}).count()
      var arr = await test.find({wallet: wallet, status: {$in:["booked", "hashed"]}}).skip(0).limit(total).toArray()
      response.json({
        success: true,
        code: 10001,
        total: total,
        content: arr
      })
    }else{
      response.json({
        code: -1,
        msg:'钱包地址不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
      msg:error.message,
      success: false
    })
  }
})

// 修改状态
getAuditList.post('/changeStatus', urlEcode, async (request, response ,next) => {
  try {
    let id = request.body.machine_id
    let wallet = request.body.wallet
    let status = request.body.status
    let size = request.body.size
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if (id&&status&&wallet) {
      const test = conn.db("identifier").collection("auditListTest")
      if (status == 'booked') {
        await test.updateOne(
          { _id: wallet+id },
          { $set: { status: 'hashed' }}
        )
        await test.updateMany(
          { machine_id: id },
          { $set: { HashSize: size+1 }}
        )
      } else if (status == 'hashed') {
        await test.updateOne(
          { _id: wallet+id },
          { $set: { status: 'confirm' }}
        )
      }
      response.json({
        code: 10001,
        msg: '提交成功，数据更新成功',
        success: true
      })
    } else {
      response.json({
        code: -1,
        msg:'参数不能为空',
        success: false
      })
    }
  } catch (error) {
    response.json({
      code: -10001,
      msg:error.message,
      success: false
    })
  }
})