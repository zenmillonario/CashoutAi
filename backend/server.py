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
from enum import Enum


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

    async def send_admin_notification(self, message: str):
        """Send notifications to all connected admins"""
        admin_users = await db.users.find({"is_admin": True}).to_list(1000)
        admin_ids = [user["id"] for user in admin_users]
        
        for user_id in admin_ids:
            if user_id in self.user_connections:
                try:
                    await self.user_connections[user_id].send_text(message)
                except:
                    pass

manager = ConnectionManager()

# Define Enums
class UserStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    is_admin: bool = False
    status: UserStatus = UserStatus.PENDING
    avatar_url: Optional[str] = None
    total_profit: float = 0.0
    win_percentage: float = 0.0
    trades_count: int = 0
    average_gain: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserApproval(BaseModel):
    user_id: str
    approved: bool
    admin_id: str

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    content: str
    is_admin: bool = False
    avatar_url: Optional[str] = None
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

class PaperTrade(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    symbol: str
    action: str  # "BUY" or "SELL"
    quantity: int
    price: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

class PaperTradeCreate(BaseModel):
    symbol: str
    action: str
    quantity: int
    price: float
    notes: Optional[str] = None

# Utility function to extract stock tickers from message
def extract_stock_tickers(content: str) -> List[str]:
    """Extract stock tickers that start with $ from message content"""
    pattern = r'\$([A-Z]{1,5})'
    matches = re.findall(pattern, content.upper())
    return matches

# Utility function to calculate user trading performance
async def calculate_user_performance(user_id: str) -> dict:
    """Calculate trading performance metrics for a user"""
    trades = await db.paper_trades.find({"user_id": user_id}).to_list(1000)
    
    if not trades:
        return {
            "total_profit": 0.0,
            "win_percentage": 0.0,
            "trades_count": 0,
            "average_gain": 0.0
        }
    
    # Group trades by symbol to calculate profit/loss
    positions = {}
    completed_trades = []
    
    for trade in sorted(trades, key=lambda x: x["timestamp"]):
        symbol = trade["symbol"]
        if symbol not in positions:
            positions[symbol] = {"shares": 0, "total_cost": 0}
        
        if trade["action"] == "BUY":
            positions[symbol]["shares"] += trade["quantity"]
            positions[symbol]["total_cost"] += trade["quantity"] * trade["price"]
        elif trade["action"] == "SELL" and positions[symbol]["shares"] > 0:
            # Calculate profit/loss for this sell
            avg_cost = positions[symbol]["total_cost"] / positions[symbol]["shares"] if positions[symbol]["shares"] > 0 else 0
            sell_quantity = min(trade["quantity"], positions[symbol]["shares"])
            profit_loss = (trade["price"] - avg_cost) * sell_quantity
            
            completed_trades.append({
                "profit_loss": profit_loss,
                "is_profitable": profit_loss > 0
            })
            
            # Update position
            positions[symbol]["shares"] -= sell_quantity
            if positions[symbol]["shares"] > 0:
                positions[symbol]["total_cost"] = (positions[symbol]["total_cost"] / positions[symbol]["shares"]) * positions[symbol]["shares"]
            else:
                positions[symbol]["total_cost"] = 0
    
    if not completed_trades:
        return {
            "total_profit": 0.0,
            "win_percentage": 0.0,
            "trades_count": len(trades),
            "average_gain": 0.0
        }
    
    total_profit = sum(trade["profit_loss"] for trade in completed_trades)
    winning_trades = sum(1 for trade in completed_trades if trade["is_profitable"])
    win_percentage = (winning_trades / len(completed_trades)) * 100 if completed_trades else 0
    average_gain = total_profit / len(completed_trades) if completed_trades else 0
    
    return {
        "total_profit": round(total_profit, 2),
        "win_percentage": round(win_percentage, 2),
        "trades_count": len(trades),
        "average_gain": round(average_gain, 2)
    }

# API Routes

@api_router.post("/users/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new user with pending status (in production, hash the password!)
    user_dict = user_data.dict()
    del user_dict['password']  # Don't store password in this simple version
    user = User(**user_dict, status=UserStatus.PENDING)
    await db.users.insert_one(user.dict())
    
    # Notify admins about new registration
    await manager.send_admin_notification(json.dumps({
        "type": "new_registration",
        "message": f"New user {user.username} has registered and is awaiting approval",
        "user": user.dict()
    }, default=str))
    
    return user

@api_router.post("/users/login", response_model=User)
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_obj = User(**user)
    
    # Check if user is approved
    if user_obj.status != UserStatus.APPROVED:
        if user_obj.status == UserStatus.PENDING:
            raise HTTPException(status_code=403, detail="Account pending admin approval")
        elif user_obj.status == UserStatus.REJECTED:
            raise HTTPException(status_code=403, detail="Account has been rejected")
    
    return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/users/pending", response_model=List[User])
async def get_pending_users():
    """Get all users pending approval - admin only"""
    users = await db.users.find({"status": UserStatus.PENDING}).to_list(1000)
    return [User(**user) for user in users]

@api_router.post("/users/approve")
async def approve_user(approval: UserApproval):
    """Approve or reject a user - admin only"""
    # Verify admin status (in production, use proper JWT auth)
    admin = await db.users.find_one({"id": approval.admin_id})
    if not admin or not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Update user status
    new_status = UserStatus.APPROVED if approval.approved else UserStatus.REJECTED
    update_data = {
        "status": new_status,
        "approved_by": approval.admin_id,
        "approved_at": datetime.utcnow()
    }
    
    result = await db.users.update_one(
        {"id": approval.user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get updated user
    user = await db.users.find_one({"id": approval.user_id})
    status_text = "approved" if approval.approved else "rejected"
    
    # Notify all admins
    await manager.send_admin_notification(json.dumps({
        "type": "user_approval",
        "message": f"User {user['username']} has been {status_text}",
        "user": user
    }, default=str))
    
    return {"message": f"User {status_text} successfully"}

@api_router.post("/messages", response_model=Message)
async def create_message(message_data: MessageCreate):
    # Get user info
    user = await db.users.find_one({"id": message_data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is approved
    if user.get("status") != UserStatus.APPROVED:
        raise HTTPException(status_code=403, detail="Only approved users can send messages")
    
    # Extract stock tickers
    tickers = extract_stock_tickers(message_data.content)
    
    message = Message(
        user_id=message_data.user_id,
        username=user["username"],
        content=message_data.content,
        is_admin=user.get("is_admin", False),
        avatar_url=user.get("avatar_url"),
        highlighted_tickers=tickers
    )
    
    await db.messages.insert_one(message.dict())
    
    # Broadcast message to all connected users
    await manager.broadcast(json.dumps({
        "type": "message",
        "data": message.dict()
    }, default=str))
    
    return message

@api_router.get("/messages", response_model=List[Message])
async def get_messages(limit: int = 50):
    messages = await db.messages.find().sort("timestamp", -1).limit(limit).to_list(limit)
    # Reverse to show oldest first
    messages.reverse()
    return [Message(**message) for message in messages]

@api_router.post("/trades", response_model=PaperTrade)
async def create_paper_trade(trade_data: PaperTradeCreate, user_id: str):
    """Create a new paper trade"""
    # Verify user exists and is approved
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("status") != UserStatus.APPROVED:
        raise HTTPException(status_code=403, detail="User not found or not approved")
    
    trade = PaperTrade(
        user_id=user_id,
        **trade_data.dict()
    )
    
    await db.paper_trades.insert_one(trade.dict())
    
    # Update user performance metrics
    performance = await calculate_user_performance(user_id)
    await db.users.update_one(
        {"id": user_id},
        {"$set": performance}
    )
    
    return trade

@api_router.get("/trades/{user_id}", response_model=List[PaperTrade])
async def get_user_trades(user_id: str):
    """Get all trades for a user"""
    trades = await db.paper_trades.find({"user_id": user_id}).sort("timestamp", -1).to_list(1000)
    return [PaperTrade(**trade) for trade in trades]

@api_router.post("/users/{user_id}/avatar")
async def upload_avatar(user_id: str, avatar_url: str):
    """Update user avatar URL"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"avatar_url": avatar_url}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to update avatar")
    
    return {"message": "Avatar updated successfully"}

@api_router.put("/users/{user_id}/profile")
async def update_profile(user_id: str, profile_data: dict):
    """Update user profile information"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only allow updating certain fields
    allowed_fields = ["username", "email", "avatar_url"]
    update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
    
    if update_data:
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update profile")
    
    # Return updated user
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

@api_router.get("/users/{user_id}/performance")
async def get_user_performance(user_id: str):
    """Get performance metrics for a user"""
    return await calculate_user_performance(user_id)

# Create default admin user on startup
@app.on_event("startup")
async def create_default_admin():
    # Check if any admin exists
    admin_exists = await db.users.find_one({"is_admin": True})
    if not admin_exists:
        # Create default admin
        admin_user = User(
            username="admin",
            email="admin@cashoutai.com",
            is_admin=True,
            status=UserStatus.APPROVED
        )
        await db.users.insert_one(admin_user.dict())
        print("Created default admin user: admin")

# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    logger.info(f"WebSocket connected for user: {user_id}")
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message(
            json.dumps({"type": "connection", "message": f"Connected as user {user_id}"}),
            websocket
        )
        
        while True:
            # Keep connection alive by receiving ping/pong or heartbeat messages
            data = await websocket.receive_text()
            logger.info(f"WebSocket received from {user_id}: {data}")
            
            # Echo back to confirm connection is alive
            await manager.send_personal_message(
                json.dumps({"type": "heartbeat", "message": "Connection alive"}),
                websocket
            )
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user: {user_id}")
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
