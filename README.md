## DBC-NodeScript
#### HttpRequest目录
- **用于书写与前端交互的详细接口内容**
    - **api.js**
        - 定义express路由
    
        ```
        /**
        * 定义路由，便于分辨对应模块
        * 导出路由模块，在router.js文件中引用
        */
        export const Select = express.Router()
        ```
        - 创建路由对应接口
        ```
        Select.get('/', (request, response ,next) => {
            ******
            调用数据库，已经数据的处理与返回
            ******
        })
        ```

    - **router.js**
        - 定义请求信息
        - 设置请求头
        ```
        /**
        * 导入api.js中路由模块
        * 设置请求头，启动server服务
        */
        // 使用 router
        serve.use('/api/select', Select)
        ```
        - 启动server服务
        ```
        serve.listen(8090, ()=>{
            console.log('服务器启动完毕');
        })
        ```
#### TimedTask目录
- **用于创建只与数据库进行交互的js文件，定时请求数据存入数据库中，以便数据及时更新**
#### testScript目录
- **用于创建node可执行脚本，仅供测试使用**
