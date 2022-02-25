// 根据路由去分模块。避免将所有路由都写在入口文件中。

//导入express模块
import express from 'express'
// 导入路由模块
import { Select } from './SelectApi.js'
import { getAuditList } from './auditListApi.js'
import { rentVirtual } from './RentVirtualApi.js'
import { Recharge } from './PaypalApi.js'
// 定义serve
const serve = express()
// 设置serve请求头参数
serve.all("*", function (req, res, next) {
  //设置允许跨域的域名，*代表允许任意域名跨域
  res.header("Access-Control-Allow-Origin", req.headers.origin || '*');
  // //允许的header类型
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  // //跨域允许的请求方式 
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  // 可以带cookies
  res.header("Access-Control-Allow-Credentials", true);
  if (req.method == 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
})
// 启动server服务
serve.listen(8090, ()=>{
  console.log('服务器启动完毕');
})

// 使用 router
serve.use('/api/select', Select)
serve.use('/api/audit', getAuditList)
serve.use('/api/rentMachine', rentVirtual)
serve.use('/api/paypal', Recharge)
//404判断
serve.use(function (req, res) {
  res.send('404 not found');
});
