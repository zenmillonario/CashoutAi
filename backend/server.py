from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import json
import re


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

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, user_id: str):
        self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    is_admin: bool = False
    avatar_url: Optional[str] = None
    total_profit: float = 0.0
    win_percentage: float = 0.0
    trades_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    content: str
    is_admin: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    highlighted_tickers: List[str] = []

class MessageCreate(BaseModel):
    content: str
    user_id: str

class Team(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    admin_ids: List[str] = []
    member_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TeamCreate(BaseModel):
    name: str
    admin_id: str

class StockTicker(BaseModel):
    symbol: str
    price: Optional[float] = None
    change: Optional[float] = None
    change_percent: Optional[str] = None

# Utility function to extract stock tickers from message
def extract_stock_tickers(content: str) -> List[str]:
    """Extract stock tickers that start with $ from message content"""
    pattern = r'\$([A-Z]{1,5})'
    matches = re.findall(pattern, content.upper())
    return matches

# API Routes

@api_router.post("/users/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create new user (in production, hash the password!)
    user_dict = user_data.dict()
    del user_dict['password']  # Don't store password in this simple version
    user = User(**user_dict)
    await db.users.insert_one(user.dict())
    return user

@api_router.post("/users/login", response_model=User)
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return User(**user)

@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.post("/teams", response_model=Team)
async def create_team(team_data: TeamCreate):
    team = Team(
        name=team_data.name,
        admin_ids=[team_data.admin_id],
        member_ids=[team_data.admin_id]
    )
    await db.teams.insert_one(team.dict())
    return team

@api_router.get("/teams", response_model=List[Team])
async def get_teams():
    teams = await db.teams.find().to_list(1000)
    return [Team(**team) for team in teams]

@api_router.post("/teams/{team_id}/join")
async def join_team(team_id: str, user_id: str):
    team = await db.teams.find_one({"id": team_id})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Add user to team if not already a member
    if user_id not in team.get("member_ids", []):
        await db.teams.update_one(
            {"id": team_id},
            {"$push": {"member_ids": user_id}}
        )
    return {"message": "Joined team successfully"}

@api_router.post("/messages", response_model=Message)
async def create_message(message_data: MessageCreate):
    # Get user info
    user = await db.users.find_one({"id": message_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Extract stock tickers
    tickers = extract_stock_tickers(message_data.content)
    
    message = Message(
        user_id=message_data.user_id,
        username=user["username"],
        content=message_data.content,
        is_admin=user.get("is_admin", False),
        highlighted_tickers=tickers
    )
    
    await db.messages.insert_one(message.dict())
    
    # Broadcast message to all connected users
    await manager.broadcast(json.dumps(message.dict(), default=str))
    
    return message

@api_router.get("/messages", response_model=List[Message])
async def get_messages(limit: int = 50):
    messages = await db.messages.find().sort("timestamp", -1).limit(limit).to_list(limit)
    # Reverse to show oldest first
    messages.reverse()
    return [Message(**message) for message in messages]

# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Keep connection alive, actual messaging happens through HTTP API
            await manager.send_personal_message(f"Connected: {user_id}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

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
