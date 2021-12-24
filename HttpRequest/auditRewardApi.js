import express from 'express'
import mongodb from 'mongodb'

// 链接数据库
const MongoClient = mongodb.MongoClient;
// const url = "mongodb://dbc:dbcDBC2017xY@localhost:27017/identifier";
const url = "mongodb://localhost:27017/identifier";


// 定义路由
export const Select = express.Router()

// 用户审核机器获取收益
Select.get('/searchMachine', async (request, response ,next) => {
  try {
    let wallet = request.query.wallet
    let pageSize = request.query.pageSize?parseInt(request.query.pageSize):1
    let pageNum = request.query.pageNum?parseInt(request.query.pageNum):20
    let perams= [(pageSize-1)*pageNum, pageNum]
    let conn = await MongoClient.connect(url, { useUnifiedTopology: true })
    if(wallet){
      const test = conn.db("identifier").collection("auditRewardTest")
      let reward = await test.aggregate([{ $group : {_id : '$wallet', todayReward : { $sum : "$todayReward" },totalReward : { $sum : "$totalReward" }}}]).toArray()
      let result = reward.length&&reward.filter(el => el._id == wallet)
      let total = await test.find({_id: {$regex:wallet}}).count()
      var arr = await test.find({_id: {$regex:wallet}}).skip(perams[0]).limit((perams[1])).toArray()
      let total_reward = result[0]?result[0].totalReward:0
      let today_reward = result[0]?result[0].todayReward:0
      response.json({
        success: true,
        code: 200,
        totalReward: total_reward,
        todayReward: today_reward,
        total: total,
        count: arr
      })
    }else{
      response.json({
        code: 10001,
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