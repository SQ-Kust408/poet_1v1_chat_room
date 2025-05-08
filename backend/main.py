from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import os
from datetime import datetime, timedelta
import httpx
from dotenv import load_dotenv
import logging
from sqlalchemy.orm import Session
from database import get_db, User, Message
from auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
import time

# 自定义 JSON 编码器
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, float):
            if obj != obj:  # 检查是否为 NaN
                return None
            if obj == float('inf') or obj == float('-inf'):  # 检查是否为 Infinity
                return None
        return super().default(obj)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# 允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 加载诗人数据
POETS_DATA = {}
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_dir = os.path.join(BASE_DIR, "data")
for file in os.listdir(data_dir):
    if file.endswith('知识图谱.json'):
        with open(os.path.join(data_dir, file), 'r', encoding='utf-8') as f:
            poet_name = file.replace('知识图谱.json', '')
            try:
                data = json.load(f)
                # 清理无效的浮点数值
                cleaned_data = json.loads(json.dumps(data, cls=CustomJSONEncoder))
                POETS_DATA[poet_name] = cleaned_data
            except Exception as e:
                logger.error(f"Error loading poet data for {poet_name}: {str(e)}")
                continue

class UserCreate(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class MessageCreate(BaseModel):
    content: str
    poet_name: str

# 速率限制配置
ONE_MINUTE = 60
MAX_REQUESTS_PER_MINUTE = 30

# 使用字典存储请求计数
request_counts = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # 获取客户端IP
    client_ip = request.client.host
    current_time = time.time()
    
    # 清理过期的请求记录
    request_counts[client_ip] = [t for t in request_counts.get(client_ip, []) 
                               if current_time - t < ONE_MINUTE]
    
    # 检查是否超过限制
    if len(request_counts.get(client_ip, [])) >= MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="请求过于频繁，请稍后再试"
        )
    
    # 添加当前请求时间戳
    if client_ip not in request_counts:
        request_counts[client_ip] = []
    request_counts[client_ip].append(current_time)
    
    # 继续处理请求
    response = await call_next(request)
    return response

@app.post("/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    """注册新用户"""
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="用户名已存在"
        )
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/poets")
async def get_poets():
    """获取所有诗人列表"""
    try:
        return list(POETS_DATA.keys())
    except Exception as e:
        logger.error(f"Error in get_poets: {str(e)}")
        raise HTTPException(status_code=500, detail="获取诗人列表失败")

@app.get("/poet/{poet_name}")
async def get_poet_info(poet_name: str):
    """获取特定诗人的信息"""
    if poet_name not in POETS_DATA:
        raise HTTPException(status_code=404, detail="诗人未找到")
    
    try:
        # 获取诗人数据
        poet_data = POETS_DATA[poet_name]
        
        # 找到诗人的基本信息
        basic_info = None
        works = []
        relations = []
        places = []
        
        for item in poet_data:
            if item["relation_to_poet"] == "本人":
                basic_info = {
                    "dynasty": item.get("dynasty", ""),
                    "birth_year": item.get("birth_year", None),
                    "death_year": item.get("death_year", None),
                    "title": item.get("title", ""),
                    "works": item.get("works", "")
                }
            elif item["type"] == "作品":
                works.append({
                    "name": item.get("name", ""),
                    "relation_to_poet": item.get("relation_to_poet", "")
                })
            elif item["type"] == "人物":
                relations.append({
                    "name": item.get("name", ""),
                    "relation_to_poet": item.get("relation_to_poet", "")
                })
            elif item["type"] == "地点":
                places.append({
                    "name": item.get("name", ""),
                    "relation_to_poet": item.get("relation_to_poet", "")
                })
        
        # 构建返回数据
        response_data = {
            "name": poet_name,
            "type": "诗人",
            "dynasty": basic_info["dynasty"] if basic_info else "",
            "PersonId": 0,
            "birth_year": basic_info["birth_year"] if basic_info else None,
            "death_year": basic_info["death_year"] if basic_info else None,
            "title": basic_info["title"] if basic_info else None,
            "works": basic_info["works"] if basic_info else None,
            "relation_to_poet": "本人",
            "basic_info": basic_info,
            "relations": relations,
            "places": places
        }
        
        return response_data
    except Exception as e:
        logger.error(f"Error in get_poet_info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取诗人信息失败: {str(e)}")

@app.get("/chat/{poet_name}/history")
async def get_chat_history(
    poet_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取与特定诗人的聊天历史"""
    messages = db.query(Message).filter(
        Message.poet_name == poet_name,
        Message.user_id == current_user.id
    ).order_by(Message.timestamp).all()
    return messages

@app.post("/chat/{poet_name}")
async def chat_with_poet(
    poet_name: str,
    message: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """与诗人对话"""
    if poet_name not in POETS_DATA:
        raise HTTPException(status_code=404, detail="诗人未找到")
    
    # 获取诗人信息
    poet_info = POETS_DATA[poet_name]
    
    # 构建 prompt
    prompt = f"""你现在是{poet_name}，一位著名的诗人。以下是你的基本信息：
    {json.dumps(poet_info, ensure_ascii=False)}
    
    请以{poet_name}的身份，用符合其性格和时代特征的方式回答用户的问题。
    用户说：{message.content}
    
    请用古代文人的语气回答，可以适当引用自己的诗词。回答要简洁有趣。"""
    
    try:
        # 检查API密钥是否存在
        api_key = os.getenv('DEEPSEEK_API_KEY')
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="API密钥未配置，请在.env文件中设置DEEPSEEK_API_KEY"
            )

        # 调用 DeepSeek API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=30.0  # 设置超时时间
            )
            
            if response.status_code != 200:
                error_msg = f"API调用失败: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
            
            response_data = response.json()
            if 'choices' not in response_data or not response_data['choices']:
                raise HTTPException(status_code=500, detail="API返回数据格式错误")
                
            bot_response = response_data['choices'][0]['message']['content']
            
            # 保存用户消息
            user_message = Message(
                content=message.content,
                role="user",
                poet_name=poet_name,
                user_id=current_user.id
            )
            db.add(user_message)
            
            # 保存机器人回复
            bot_message = Message(
                content=bot_response,
                role="assistant",
                poet_name=poet_name,
                user_id=current_user.id
            )
            db.add(bot_message)
            
            db.commit()
            
            return {"response": bot_response}
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in chat_with_poet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"聊天失败: {str(e)}")

@app.get("/search")
async def search_messages(
    query: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """搜索消息历史"""
    messages = db.query(Message).filter(
        Message.user_id == current_user.id,
        Message.content.ilike(f"%{query}%")
    ).order_by(Message.timestamp.desc()).all()
    return messages

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002) 