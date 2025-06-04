from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# WebSocket manager for real-time chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: dict = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        if websocket.application_state == WebSocketState.CONNECTED:
            await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                if connection.application_state == WebSocketState.CONNECTED:
                    await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    name: str
    role: str
    profile_picture: Optional[str] = None
    joinedAt: datetime = Field(default_factory=datetime.utcnow)
    lastActive: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    role: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatMessageCreate(BaseModel):
    message: str

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Authentication endpoints
@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Admin login
    if credentials.username == 'admin' and credentials.password == 'admin123':
        user = User(
            username='admin',
            name='Admin User',
            role='admin'
        )
        # Save/update user in database
        await db.users.replace_one(
            {"username": user.username},
            user.dict(),
            upsert=True
        )
        return {"success": True, "user": user}
    
    # Regular user login - any username/password works for demo
    if credentials.username and credentials.password:
        user = User(
            username=credentials.username,
            name=credentials.username,
            role='trader'
        )
        # Save/update user in database
        await db.users.replace_one(
            {"username": user.username},
            user.dict(),
            upsert=True
        )
        return {"success": True, "user": user}
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

# User management endpoints
@api_router.get("/users/me/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/me/{user_id}/profile")
async def update_profile(user_id: str, update_data: dict):
    # Update user profile including profile picture
    update_fields = {}
    if "name" in update_data:
        update_fields["name"] = update_data["name"]
    if "profile_picture" in update_data:
        update_fields["profile_picture"] = update_data["profile_picture"]
    
    if update_fields:
        update_fields["lastActive"] = datetime.utcnow()
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": update_fields}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"id": user_id})
    return User(**user)

# Chat endpoints
@api_router.get("/chat/messages", response_model=List[ChatMessage])
async def get_chat_messages():
    messages = await db.chat_messages.find().sort("timestamp", 1).to_list(100)
    return [ChatMessage(**message) for message in messages]

@api_router.post("/chat/messages")
async def send_message(user_id: str, message_data: ChatMessageCreate):
    # Get user info
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create message
    message = ChatMessage(
        user_id=user_id,
        username=user["username"],
        role=user["role"],
        message=message_data.message
    )
    
    # Save to database
    await db.chat_messages.insert_one(message.dict())
    
    # Broadcast to all connected users
    await manager.broadcast(json.dumps({
        "type": "new_message",
        "data": message.dict(default=str)
    }))
    
    return message

@api_router.get("/chat/online-users")
async def get_online_users():
    return {"count": len(manager.active_connections)}

# WebSocket endpoint for real-time chat
@app.websocket("/ws/chat/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for connection test
            await manager.send_personal_message(f"Message received: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

# Original status check endpoints
@api_router.get("/")
async def root():
    return {"message": "CashOutAI Backend API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
