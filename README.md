# 古代诗人对话系统

基于大语言模型的古代诗人对话系统，提供沉浸式的跨时代交流体验。用户可以选择不同朝代的著名诗人，体验符合其历史背景和创作风格的对话交互。

## 功能特性
实际效果图可看聊天图片
### 后端功能
- 📚 诗人知识图谱管理
- 💬 基于DeepSeek API的对话生成
- 🔒 JWT用户认证系统
- ⏱ 请求速率限制（30次/分钟）
- 📊 SQLite数据持久化
- 🌐 支持跨域请求

### 前端功能
- 🎨 Ant Design交互界面
- 👥 用户注册/登录系统
- 📖 诗人基本信息展示
- 🕰 聊天历史记录与检索
- 📱 响应式布局设计

## 技术栈

### 后端
- FastAPI + Uvicorn
- SQLAlchemy + SQLite
- JWT认证 + bcrypt加密
- DeepSeek API集成

### 前端
- React + TypeScript
- Ant Design组件库
- styled-components
- Axios HTTP客户端

### 数据库
- SQLite关系型数据库
- 诗人知识图谱JSON数据

## 安装部署

### 后端服务
```bash
cd backend
pip install -r requirements.txt
```
# 启动服务（默认端口8002）
```bash
uvicorn main:app --reload --port 8002
```

### 前端服务
```bash
cd frontend
npm install

# 启动开发服务器（默认端口3000）
npm start
```
### 配置说明
```ini
DEEPSEEK_API_KEY=your_api_key_here
SECRET_KEY=jwt_secret_key_here
DATABASE_URL=sqlite:///./data/db/chat.db
```
# 项目结构
```
poem_agent/
├── backend/            # FastAPI后端
│   ├── data/           # 数据存储
│   │   ├── db/         # 数据库文件
│   │   └── poets/      # 诗人知识图谱
├── frontend/           # React前端
│   ├── public/
│   └── src/
│       ├── components/ # 界面组件
│       ├── services/   # API服务
│       └── types/      # TypeScript类型定义
└── data/               # 原始数据文件
    ├── excel/          # Excel数据源
    └── json/           # 转换后的JSON数据
```

