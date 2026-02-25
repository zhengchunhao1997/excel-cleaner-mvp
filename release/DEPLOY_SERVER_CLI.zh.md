## excelMerge 部署文档（命令行 + Nginx）

适用场景：
- 使用 Nginx（宝塔或手工均可）做反代与静态站点
- 后端采用命令行守护运行
- MySQL 8.0 与后端在同一台服务器或可达网络

### 0) 产物与环境文件规则

后端产物：`server.tar.gz`  
前端产物：`frontend.tar.gz`

环境文件规则：
- 本地开发机：`.env`（本地运行）、`.env.example`（模板）
- 生产服务器：`.env.production`（生产运行）、`.env.production.example`（模板）

后端读取规则：
- 若设置 `DOTENV_CONFIG_PATH`，优先读取该文件
- 否则 `NODE_ENV=production` 读取 `.env.production`
- 否则读取 `.env`

deepseek-key
sk-965381d9fba2471d93687790fa5df4e2

### 1) 在本地打包（生成产物）

推荐脚本：

```bash
cd excel-cleaner-mvp
VITE_API_BASE="http://你的域名或IP" bash release/build_artifacts.sh
```

输出位置：
- `release/artifacts/server.tar.gz`
- `release/artifacts/frontend.tar.gz`

### 2) 后端部署（服务器）

建议目录：

```bash
mkdir -p /opt/excelMerge/server
tar -xzf server.tar.gz -C /opt/excelMerge/server
cd /opt/excelMerge/server
```

解压后必须存在：
- `dist/index.js`
- `package.json` / `package-lock.json`
- `.env.production.example`
- `run.sh`

安装依赖：

```bash
bash run.sh install
```

配置生产环境：

```bash
cp .env.production.example .env.production
nano .env.production
```

必须配置：
- `PORT=3000`
- `DATABASE_URL=mysql://USER:PASSWORD@127.0.0.1:3306/DBNAME`
- `ADMIN_TOKEN=<强随机>`
- `JWT_SECRET=<强随机长字符串>`

可选：
- `CORS_ORIGIN=https://你的域名`
- `DEEPSEEK_API_KEY=...`

首次前台启动验证：

```bash
cd /opt/excelMerge/server
NODE_ENV=production \
DOTENV_CONFIG_PATH=/opt/excelMerge/server/.env.production \
node dist/index.js
```

验证成功后，改为守护运行：

```bash
bash run.sh start
```

常用命令：

```bash
bash run.sh status
bash run.sh logs
bash run.sh restart
bash run.sh stop
```

本机健康检查：

```bash
curl http://127.0.0.1:3000/
```

期望返回：`excelMerge API is running`

### 3) 前端部署（服务器）

建议目录：

```bash
mkdir -p /var/www/excelMerge-frontend
tar -xzf frontend.tar.gz -C /var/www/excelMerge-frontend
```

该目录应包含：
- `index.html`
- `assets/`
- `manifest.json`

### 4) Nginx 配置（反代 + 静态站点）

示例（可直接用于宝塔或 Nginx 配置）：

```nginx
server {
  listen 80;
  server_name 你的域名或IP;

  root /website/excelMerge-server/excelMerge-frontend;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /admin {
    proxy_pass http://127.0.0.1:3000/admin;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

后台访问：
- `http://你的域名或IP/admin?token=<ADMIN_TOKEN>`

### 5) 日常更新（只替换产物）

后端更新：

```bash
cd /opt/excelMerge/server
tar -xzf server.tar.gz -C /opt/excelMerge/server
```

仅当 `package-lock.json` 变化时重新安装依赖：

```bash
bash run.sh install
```

重启服务：

```bash
bash run.sh restart
```

前端更新：

```bash
tar -xzf frontend.tar.gz -C /var/www/excelMerge-frontend
```

### 6) 常见问题

数据库连接失败：
- 检查 `DATABASE_URL` 格式是否为 `mysql://USER:PASSWORD@HOST:3306/DBNAME`
- 确认 MySQL 账号有该库权限

外网 502：
- 先在服务器执行 `curl http://127.0.0.1:3000/`
- 确认 Nginx 反代地址为 `http://127.0.0.1:3000`

无法建表：
- 给数据库账号开库权限

```sql
grant all privileges on DBNAME.* to 'USER'@'%' identified by 'PASSWORD';
flush privileges;
```
