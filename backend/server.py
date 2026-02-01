from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from enum import Enum
import base64
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'campus-store-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Campus Store API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============== ENUMS ==============
class UserStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"

class UserRole(str, Enum):
    STUDENT = "student"
    ADMIN = "admin"

class ItemMode(str, Enum):
    BUY = "buy"
    BORROW = "borrow"
    BOTH = "both"

class ItemStatus(str, Enum):
    AVAILABLE = "available"
    RENTED = "rented"
    SOLD = "sold"
    UNAVAILABLE = "unavailable"

class ItemCondition(str, Enum):
    NEW = "new"
    LIKE_NEW = "like_new"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"

class OrderStatus(str, Enum):
    CREATED = "created"
    PAID = "paid"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class BorrowStatus(str, Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    ACTIVE = "active"
    RETURNED = "returned"
    CLOSED = "closed"
    REJECTED = "rejected"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"

# ============== MODELS ==============

# College Models
class CollegeCreate(BaseModel):
    name: str
    domain: str
    is_active: bool = True

class College(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    domain: str
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    college_id: str
    student_id_image: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    college_id: str
    college_name: Optional[str] = None
    role: str
    status: str
    rating: float = 0.0
    total_reviews: int = 0
    created_at: str
    avatar_url: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

# Item Models
class ItemCreate(BaseModel):
    title: str
    description: str
    category: str
    mode: ItemMode
    price_buy: Optional[float] = None
    price_borrow: Optional[float] = None
    deposit: Optional[float] = None
    condition: ItemCondition
    images: List[str] = []

class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    mode: Optional[ItemMode] = None
    price_buy: Optional[float] = None
    price_borrow: Optional[float] = None
    deposit: Optional[float] = None
    condition: Optional[ItemCondition] = None
    status: Optional[ItemStatus] = None
    images: Optional[List[str]] = None

class ItemResponse(BaseModel):
    id: str
    college_id: str
    owner_id: str
    owner_name: Optional[str] = None
    owner_rating: Optional[float] = None
    title: str
    description: str
    category: str
    mode: str
    price_buy: Optional[float] = None
    price_borrow: Optional[float] = None
    deposit: Optional[float] = None
    condition: str
    status: str
    images: List[str] = []
    created_at: str
    updated_at: str

# Order Models (Buy)
class OrderCreate(BaseModel):
    item_id: str

class OrderResponse(BaseModel):
    id: str
    item_id: str
    item_title: Optional[str] = None
    item_image: Optional[str] = None
    buyer_id: str
    seller_id: str
    seller_name: Optional[str] = None
    amount: float
    status: str
    payment_status: str
    payment_session_id: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None

# Borrow Request Models
class BorrowRequestCreate(BaseModel):
    item_id: str
    start_date: str
    end_date: str

class BorrowRequestResponse(BaseModel):
    id: str
    item_id: str
    item_title: Optional[str] = None
    item_image: Optional[str] = None
    borrower_id: str
    borrower_name: Optional[str] = None
    lender_id: str
    lender_name: Optional[str] = None
    start_date: str
    end_date: str
    days: int
    rental_amount: float
    deposit_amount: float
    total_amount: float
    status: str
    payment_status: str
    payment_session_id: Optional[str] = None
    created_at: str
    returned_at: Optional[str] = None

class BorrowApproval(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

# Review Models
class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    order_id: Optional[str] = None
    borrow_id: Optional[str] = None

class ReviewResponse(BaseModel):
    id: str
    reviewer_id: str
    reviewer_name: str
    reviewee_id: str
    rating: int
    comment: Optional[str] = None
    created_at: str

# Payment Models
class PaymentCreate(BaseModel):
    order_id: Optional[str] = None
    borrow_id: Optional[str] = None
    origin_url: str

class PaymentResponse(BaseModel):
    checkout_url: str
    session_id: str

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    amount_total: float
    currency: str

# ============== AUTH HELPERS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, college_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "college_id": college_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user["status"] != UserStatus.ACTIVE.value:
            raise HTTPException(status_code=403, detail="Account not active")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== COLLEGE ENDPOINTS ==============
@api_router.get("/colleges", response_model=List[College])
async def get_colleges():
    colleges = await db.colleges.find({"is_active": True}, {"_id": 0}).to_list(100)
    return colleges

@api_router.post("/colleges", response_model=College)
async def create_college(college: CollegeCreate):
    college_doc = College(**college.model_dump())
    await db.colleges.insert_one(college_doc.model_dump())
    return college_doc

# ============== AUTH ENDPOINTS ==============
@api_router.post("/auth/signup")
async def signup(user: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Verify college exists
    college = await db.colleges.find_one({"id": user.college_id}, {"_id": 0})
    if not college:
        raise HTTPException(status_code=400, detail="Invalid college")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "phone": user.phone,
        "college_id": user.college_id,
        "role": UserRole.STUDENT.value,
        "status": UserStatus.ACTIVE.value,  # Auto-approve for MVP
        "rating": 0.0,
        "total_reviews": 0,
        "avatar_url": f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_id}",
        "student_id_image": user.student_id_image,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.college_id, UserRole.STUDENT.value)
    
    # Send welcome email (async, non-blocking)
    asyncio.create_task(send_email_async(
        user.email,
        "Welcome to Campus Store!",
        get_welcome_email_html(user.name, college["name"])
    ))
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user.email,
            "name": user.name,
            "college_id": user.college_id,
            "college_name": college["name"],
            "role": UserRole.STUDENT.value,
            "status": UserStatus.ACTIVE.value,
            "rating": 0.0,
            "total_reviews": 0,
            "avatar_url": user_doc["avatar_url"],
            "created_at": user_doc["created_at"]
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if user["status"] != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Account not active")
    
    college = await db.colleges.find_one({"id": user["college_id"]}, {"_id": 0})
    
    token = create_token(user["id"], user["college_id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "phone": user.get("phone"),
            "college_id": user["college_id"],
            "college_name": college["name"] if college else None,
            "role": user["role"],
            "status": user["status"],
            "rating": user.get("rating", 0.0),
            "total_reviews": user.get("total_reviews", 0),
            "avatar_url": user.get("avatar_url"),
            "created_at": user["created_at"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    college = await db.colleges.find_one({"id": current_user["college_id"]}, {"_id": 0})
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        phone=current_user.get("phone"),
        college_id=current_user["college_id"],
        college_name=college["name"] if college else None,
        role=current_user["role"],
        status=current_user["status"],
        rating=current_user.get("rating", 0.0),
        total_reviews=current_user.get("total_reviews", 0),
        avatar_url=current_user.get("avatar_url"),
        created_at=current_user["created_at"]
    )

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(update: UserUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_data})
    
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    college = await db.colleges.find_one({"id": user["college_id"]}, {"_id": 0})
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        college_id=user["college_id"],
        college_name=college["name"] if college else None,
        role=user["role"],
        status=user["status"],
        rating=user.get("rating", 0.0),
        total_reviews=user.get("total_reviews", 0),
        avatar_url=user.get("avatar_url"),
        created_at=user["created_at"]
    )

# ============== ITEM ENDPOINTS ==============
@api_router.post("/items", response_model=ItemResponse)
async def create_item(item: ItemCreate, current_user: dict = Depends(get_current_user)):
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    item_doc = {
        "id": item_id,
        "college_id": current_user["college_id"],
        "owner_id": current_user["id"],
        "title": item.title,
        "description": item.description,
        "category": item.category,
        "mode": item.mode.value,
        "price_buy": item.price_buy,
        "price_borrow": item.price_borrow,
        "deposit": item.deposit,
        "condition": item.condition.value,
        "status": ItemStatus.AVAILABLE.value,
        "images": item.images,
        "created_at": now,
        "updated_at": now
    }
    
    await db.items.insert_one(item_doc)
    
    return ItemResponse(
        **{k: v for k, v in item_doc.items()},
        owner_name=current_user["name"],
        owner_rating=current_user.get("rating", 0.0)
    )

@api_router.get("/items", response_model=List[ItemResponse])
async def get_items(
    mode: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    condition: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Filter by college (multi-tenancy)
    query = {
        "college_id": current_user["college_id"],
        "status": {"$in": [ItemStatus.AVAILABLE.value, ItemStatus.RENTED.value]}
    }
    
    if mode and mode != "all":
        if mode == "buy":
            query["mode"] = {"$in": [ItemMode.BUY.value, ItemMode.BOTH.value]}
        elif mode == "borrow":
            query["mode"] = {"$in": [ItemMode.BORROW.value, ItemMode.BOTH.value]}
    
    if category and category != "all":
        query["category"] = category
    
    if condition:
        query["condition"] = condition
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    items = await db.items.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with owner info
    result = []
    for item in items:
        owner = await db.users.find_one({"id": item["owner_id"]}, {"_id": 0, "name": 1, "rating": 1})
        result.append(ItemResponse(
            **item,
            owner_name=owner["name"] if owner else "Unknown",
            owner_rating=owner.get("rating", 0.0) if owner else 0.0
        ))
    
    return result

@api_router.get("/items/my", response_model=List[ItemResponse])
async def get_my_items(current_user: dict = Depends(get_current_user)):
    items = await db.items.find(
        {"owner_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [ItemResponse(
        **item,
        owner_name=current_user["name"],
        owner_rating=current_user.get("rating", 0.0)
    ) for item in items]

@api_router.get("/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check college access
    if item["college_id"] != current_user["college_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    owner = await db.users.find_one({"id": item["owner_id"]}, {"_id": 0, "name": 1, "rating": 1})
    
    return ItemResponse(
        **item,
        owner_name=owner["name"] if owner else "Unknown",
        owner_rating=owner.get("rating", 0.0) if owner else 0.0
    )

@api_router.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, update: ItemUpdate, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v.value if isinstance(v, Enum) else v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.items.update_one({"id": item_id}, {"$set": update_data})
    
    updated_item = await db.items.find_one({"id": item_id}, {"_id": 0})
    return ItemResponse(
        **updated_item,
        owner_name=current_user["name"],
        owner_rating=current_user.get("rating", 0.0)
    )

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.items.delete_one({"id": item_id})
    return {"message": "Item deleted"}

# ============== CATEGORIES ==============
CATEGORIES = [
    {"id": "textbooks", "name": "Textbooks", "icon": "book"},
    {"id": "electronics", "name": "Electronics", "icon": "laptop"},
    {"id": "furniture", "name": "Furniture", "icon": "sofa"},
    {"id": "clothing", "name": "Clothing", "icon": "shirt"},
    {"id": "sports", "name": "Sports", "icon": "dumbbell"},
    {"id": "instruments", "name": "Instruments", "icon": "music"},
    {"id": "appliances", "name": "Appliances", "icon": "refrigerator"},
    {"id": "other", "name": "Other", "icon": "package"}
]

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ============== BUY (ORDER) ENDPOINTS ==============
@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": order.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["college_id"] != current_user["college_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if item["status"] != ItemStatus.AVAILABLE.value:
        raise HTTPException(status_code=400, detail="Item not available")
    
    if item["mode"] not in [ItemMode.BUY.value, ItemMode.BOTH.value]:
        raise HTTPException(status_code=400, detail="Item not for sale")
    
    if item["owner_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot buy your own item")
    
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "item_id": item["id"],
        "buyer_id": current_user["id"],
        "seller_id": item["owner_id"],
        "college_id": current_user["college_id"],
        "amount": float(item["price_buy"]),
        "status": OrderStatus.CREATED.value,
        "payment_status": PaymentStatus.PENDING.value,
        "payment_session_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.orders.insert_one(order_doc)
    
    seller = await db.users.find_one({"id": item["owner_id"]}, {"_id": 0, "name": 1})
    
    return OrderResponse(
        **order_doc,
        item_title=item["title"],
        item_image=item["images"][0] if item["images"] else None,
        seller_name=seller["name"] if seller else "Unknown"
    )

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_orders(type: Optional[str] = "bought", current_user: dict = Depends(get_current_user)):
    if type == "sold":
        query = {"seller_id": current_user["id"]}
    else:
        query = {"buyer_id": current_user["id"]}
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for order in orders:
        item = await db.items.find_one({"id": order["item_id"]}, {"_id": 0})
        seller = await db.users.find_one({"id": order["seller_id"]}, {"_id": 0, "name": 1})
        result.append(OrderResponse(
            **order,
            item_title=item["title"] if item else "Unknown",
            item_image=item["images"][0] if item and item["images"] else None,
            seller_name=seller["name"] if seller else "Unknown"
        ))
    
    return result

@api_router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["buyer_id"] != current_user["id"] and order["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    item = await db.items.find_one({"id": order["item_id"]}, {"_id": 0})
    seller = await db.users.find_one({"id": order["seller_id"]}, {"_id": 0, "name": 1})
    
    return OrderResponse(
        **order,
        item_title=item["title"] if item else "Unknown",
        item_image=item["images"][0] if item and item["images"] else None,
        seller_name=seller["name"] if seller else "Unknown"
    )

@api_router.post("/orders/{order_id}/complete")
async def complete_order(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["buyer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only buyer can complete")
    
    if order["payment_status"] != PaymentStatus.PAID.value:
        raise HTTPException(status_code=400, detail="Payment not completed")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": OrderStatus.COMPLETED.value,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Mark item as sold
    await db.items.update_one(
        {"id": order["item_id"]},
        {"$set": {"status": ItemStatus.SOLD.value}}
    )
    
    return {"message": "Order completed"}

# ============== BORROW ENDPOINTS ==============
@api_router.post("/borrow", response_model=BorrowRequestResponse)
async def create_borrow_request(request: BorrowRequestCreate, current_user: dict = Depends(get_current_user)):
    item = await db.items.find_one({"id": request.item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["college_id"] != current_user["college_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if item["status"] != ItemStatus.AVAILABLE.value:
        raise HTTPException(status_code=400, detail="Item not available")
    
    if item["mode"] not in [ItemMode.BORROW.value, ItemMode.BOTH.value]:
        raise HTTPException(status_code=400, detail="Item not for borrow")
    
    if item["owner_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot borrow your own item")
    
    # Calculate rental period and amounts
    start = datetime.fromisoformat(request.start_date.replace('Z', '+00:00'))
    end = datetime.fromisoformat(request.end_date.replace('Z', '+00:00'))
    days = max((end - start).days, 1)
    
    rental_amount = float(item["price_borrow"]) * days
    deposit_amount = float(item["deposit"]) if item["deposit"] else 0.0
    
    borrow_id = str(uuid.uuid4())
    borrow_doc = {
        "id": borrow_id,
        "item_id": item["id"],
        "borrower_id": current_user["id"],
        "lender_id": item["owner_id"],
        "college_id": current_user["college_id"],
        "start_date": request.start_date,
        "end_date": request.end_date,
        "days": days,
        "rental_amount": rental_amount,
        "deposit_amount": deposit_amount,
        "total_amount": rental_amount + deposit_amount,
        "status": BorrowStatus.REQUESTED.value,
        "payment_status": PaymentStatus.PENDING.value,
        "payment_session_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "returned_at": None
    }
    
    await db.borrow_requests.insert_one(borrow_doc)
    
    lender = await db.users.find_one({"id": item["owner_id"]}, {"_id": 0, "name": 1, "email": 1})
    
    # Send email notification to lender
    if lender and lender.get("email"):
        asyncio.create_task(send_email_async(
            lender["email"],
            f"New Borrow Request for {item['title']}",
            get_borrow_request_email_html(
                lender["name"],
                current_user["name"],
                item["title"],
                days,
                rental_amount + deposit_amount
            )
        ))
    
    return BorrowRequestResponse(
        **borrow_doc,
        item_title=item["title"],
        item_image=item["images"][0] if item["images"] else None,
        borrower_name=current_user["name"],
        lender_name=lender["name"] if lender else "Unknown"
    )

@api_router.get("/borrow", response_model=List[BorrowRequestResponse])
async def get_borrow_requests(type: Optional[str] = "borrowed", current_user: dict = Depends(get_current_user)):
    if type == "lent":
        query = {"lender_id": current_user["id"]}
    else:
        query = {"borrower_id": current_user["id"]}
    
    borrows = await db.borrow_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for borrow in borrows:
        item = await db.items.find_one({"id": borrow["item_id"]}, {"_id": 0})
        borrower = await db.users.find_one({"id": borrow["borrower_id"]}, {"_id": 0, "name": 1})
        lender = await db.users.find_one({"id": borrow["lender_id"]}, {"_id": 0, "name": 1})
        result.append(BorrowRequestResponse(
            **borrow,
            item_title=item["title"] if item else "Unknown",
            item_image=item["images"][0] if item and item["images"] else None,
            borrower_name=borrower["name"] if borrower else "Unknown",
            lender_name=lender["name"] if lender else "Unknown"
        ))
    
    return result

@api_router.get("/borrow/pending", response_model=List[BorrowRequestResponse])
async def get_pending_requests(current_user: dict = Depends(get_current_user)):
    """Get pending borrow requests for items owned by current user (lender view)"""
    borrows = await db.borrow_requests.find(
        {"lender_id": current_user["id"], "status": BorrowStatus.REQUESTED.value},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    result = []
    for borrow in borrows:
        item = await db.items.find_one({"id": borrow["item_id"]}, {"_id": 0})
        borrower = await db.users.find_one({"id": borrow["borrower_id"]}, {"_id": 0, "name": 1})
        result.append(BorrowRequestResponse(
            **borrow,
            item_title=item["title"] if item else "Unknown",
            item_image=item["images"][0] if item and item["images"] else None,
            borrower_name=borrower["name"] if borrower else "Unknown",
            lender_name=current_user["name"]
        ))
    
    return result

@api_router.get("/borrow/{borrow_id}", response_model=BorrowRequestResponse)
async def get_borrow_request(borrow_id: str, current_user: dict = Depends(get_current_user)):
    borrow = await db.borrow_requests.find_one({"id": borrow_id}, {"_id": 0})
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    
    if borrow["borrower_id"] != current_user["id"] and borrow["lender_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    item = await db.items.find_one({"id": borrow["item_id"]}, {"_id": 0})
    borrower = await db.users.find_one({"id": borrow["borrower_id"]}, {"_id": 0, "name": 1})
    lender = await db.users.find_one({"id": borrow["lender_id"]}, {"_id": 0, "name": 1})
    
    return BorrowRequestResponse(
        **borrow,
        item_title=item["title"] if item else "Unknown",
        item_image=item["images"][0] if item and item["images"] else None,
        borrower_name=borrower["name"] if borrower else "Unknown",
        lender_name=lender["name"] if lender else "Unknown"
    )

@api_router.post("/borrow/{borrow_id}/approve")
async def approve_borrow_request(borrow_id: str, approval: BorrowApproval, current_user: dict = Depends(get_current_user)):
    borrow = await db.borrow_requests.find_one({"id": borrow_id}, {"_id": 0})
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    
    if borrow["lender_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only lender can approve")
    
    if borrow["status"] != BorrowStatus.REQUESTED.value:
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Get borrower and item info for email
    borrower = await db.users.find_one({"id": borrow["borrower_id"]}, {"_id": 0, "name": 1, "email": 1})
    item = await db.items.find_one({"id": borrow["item_id"]}, {"_id": 0, "title": 1})
    
    if approval.approved:
        await db.borrow_requests.update_one(
            {"id": borrow_id},
            {"$set": {"status": BorrowStatus.APPROVED.value}}
        )
        
        # Send approval email to borrower
        if borrower and borrower.get("email"):
            asyncio.create_task(send_email_async(
                borrower["email"],
                f"Your Borrow Request Approved - {item['title'] if item else 'Item'}",
                get_borrow_approved_email_html(
                    borrower["name"],
                    item["title"] if item else "Item",
                    current_user["name"],
                    borrow["total_amount"]
                )
            ))
        
        return {"message": "Request approved"}
    else:
        await db.borrow_requests.update_one(
            {"id": borrow_id},
            {"$set": {
                "status": BorrowStatus.REJECTED.value,
                "rejection_reason": approval.rejection_reason
            }}
        )
        return {"message": "Request rejected"}

@api_router.post("/borrow/{borrow_id}/return")
async def return_item(borrow_id: str, current_user: dict = Depends(get_current_user)):
    borrow = await db.borrow_requests.find_one({"id": borrow_id}, {"_id": 0})
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    
    if borrow["borrower_id"] != current_user["id"] and borrow["lender_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if borrow["status"] != BorrowStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Rental not active")
    
    await db.borrow_requests.update_one(
        {"id": borrow_id},
        {"$set": {
            "status": BorrowStatus.RETURNED.value,
            "returned_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Make item available again
    await db.items.update_one(
        {"id": borrow["item_id"]},
        {"$set": {"status": ItemStatus.AVAILABLE.value}}
    )
    
    return {"message": "Item returned"}

@api_router.post("/borrow/{borrow_id}/confirm-return")
async def confirm_return(borrow_id: str, current_user: dict = Depends(get_current_user)):
    """Lender confirms return and deposit is refunded"""
    borrow = await db.borrow_requests.find_one({"id": borrow_id}, {"_id": 0})
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow request not found")
    
    if borrow["lender_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only lender can confirm return")
    
    if borrow["status"] != BorrowStatus.RETURNED.value:
        raise HTTPException(status_code=400, detail="Item not returned yet")
    
    await db.borrow_requests.update_one(
        {"id": borrow_id},
        {"$set": {
            "status": BorrowStatus.CLOSED.value,
            "payment_status": PaymentStatus.REFUNDED.value
        }}
    )
    
    return {"message": "Return confirmed, deposit refunded"}

# ============== PAYMENT ENDPOINTS ==============
@api_router.post("/payments/checkout", response_model=PaymentResponse)
async def create_checkout(payment: PaymentCreate, request: Request, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    origin_url = payment.origin_url
    
    if payment.order_id:
        # Buy payment
        order = await db.orders.find_one({"id": payment.order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order["buyer_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        amount = order["amount"]
        metadata = {
            "type": "buy",
            "order_id": payment.order_id,
            "user_id": current_user["id"]
        }
    elif payment.borrow_id:
        # Borrow payment
        borrow = await db.borrow_requests.find_one({"id": payment.borrow_id}, {"_id": 0})
        if not borrow:
            raise HTTPException(status_code=404, detail="Borrow request not found")
        if borrow["borrower_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        if borrow["status"] != BorrowStatus.APPROVED.value:
            raise HTTPException(status_code=400, detail="Request not approved")
        
        amount = borrow["total_amount"]
        metadata = {
            "type": "borrow",
            "borrow_id": payment.borrow_id,
            "user_id": current_user["id"]
        }
    else:
        raise HTTPException(status_code=400, detail="Order or borrow ID required")
    
    # Create Stripe checkout
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment/cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Record payment transaction
    payment_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": current_user["id"],
        "order_id": payment.order_id,
        "borrow_id": payment.borrow_id,
        "amount": float(amount),
        "currency": "usd",
        "payment_status": PaymentStatus.PENDING.value,
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(payment_doc)
    
    # Update order/borrow with session ID
    if payment.order_id:
        await db.orders.update_one(
            {"id": payment.order_id},
            {"$set": {"payment_session_id": session.session_id}}
        )
    elif payment.borrow_id:
        await db.borrow_requests.update_one(
            {"id": payment.borrow_id},
            {"$set": {"payment_session_id": session.session_id}}
        )
    
    return PaymentResponse(checkout_url=session.url, session_id=session.session_id)

@api_router.get("/payments/status/{session_id}", response_model=PaymentStatusResponse)
async def get_payment_status(session_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction
    payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    
    if payment and status.payment_status == "paid" and payment["payment_status"] != PaymentStatus.PAID.value:
        # Update payment status
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": PaymentStatus.PAID.value}}
        )
        
        # Update order or borrow
        if payment.get("order_id"):
            await db.orders.update_one(
                {"id": payment["order_id"]},
                {"$set": {
                    "payment_status": PaymentStatus.PAID.value,
                    "status": OrderStatus.PAID.value
                }}
            )
        elif payment.get("borrow_id"):
            await db.borrow_requests.update_one(
                {"id": payment["borrow_id"]},
                {"$set": {
                    "payment_status": PaymentStatus.PAID.value,
                    "status": BorrowStatus.ACTIVE.value
                }}
            )
            # Mark item as rented
            borrow = await db.borrow_requests.find_one({"id": payment["borrow_id"]}, {"_id": 0})
            if borrow:
                await db.items.update_one(
                    {"id": borrow["item_id"]},
                    {"$set": {"status": ItemStatus.RENTED.value}}
                )
    
    return PaymentStatusResponse(
        status=status.status,
        payment_status=status.payment_status,
        amount_total=status.amount_total / 100,  # Convert from cents
        currency=status.currency
    )

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            payment = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            
            if payment and payment["payment_status"] != PaymentStatus.PAID.value:
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": PaymentStatus.PAID.value}}
                )
                
                if payment.get("order_id"):
                    await db.orders.update_one(
                        {"id": payment["order_id"]},
                        {"$set": {
                            "payment_status": PaymentStatus.PAID.value,
                            "status": OrderStatus.PAID.value
                        }}
                    )
                elif payment.get("borrow_id"):
                    await db.borrow_requests.update_one(
                        {"id": payment["borrow_id"]},
                        {"$set": {
                            "payment_status": PaymentStatus.PAID.value,
                            "status": BorrowStatus.ACTIVE.value
                        }}
                    )
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ============== REVIEW ENDPOINTS ==============
@api_router.post("/reviews", response_model=ReviewResponse)
async def create_review(review: ReviewCreate, current_user: dict = Depends(get_current_user)):
    reviewee_id = None
    
    if review.order_id:
        order = await db.orders.find_one({"id": review.order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order["buyer_id"] == current_user["id"]:
            reviewee_id = order["seller_id"]
        elif order["seller_id"] == current_user["id"]:
            reviewee_id = order["buyer_id"]
        else:
            raise HTTPException(status_code=403, detail="Not part of this order")
    elif review.borrow_id:
        borrow = await db.borrow_requests.find_one({"id": review.borrow_id}, {"_id": 0})
        if not borrow:
            raise HTTPException(status_code=404, detail="Borrow request not found")
        if borrow["borrower_id"] == current_user["id"]:
            reviewee_id = borrow["lender_id"]
        elif borrow["lender_id"] == current_user["id"]:
            reviewee_id = borrow["borrower_id"]
        else:
            raise HTTPException(status_code=403, detail="Not part of this transaction")
    else:
        raise HTTPException(status_code=400, detail="Order or borrow ID required")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "reviewer_id": current_user["id"],
        "$or": [
            {"order_id": review.order_id},
            {"borrow_id": review.borrow_id}
        ]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already reviewed")
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "reviewer_id": current_user["id"],
        "reviewee_id": reviewee_id,
        "order_id": review.order_id,
        "borrow_id": review.borrow_id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update user rating
    reviews = await db.reviews.find({"reviewee_id": reviewee_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.users.update_one(
        {"id": reviewee_id},
        {"$set": {"rating": round(avg_rating, 1), "total_reviews": len(reviews)}}
    )
    
    return ReviewResponse(
        id=review_id,
        reviewer_id=current_user["id"],
        reviewer_name=current_user["name"],
        reviewee_id=reviewee_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review_doc["created_at"]
    )

@api_router.get("/reviews/{user_id}", response_model=List[ReviewResponse])
async def get_user_reviews(user_id: str):
    reviews = await db.reviews.find({"reviewee_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    result = []
    for review in reviews:
        reviewer = await db.users.find_one({"id": review["reviewer_id"]}, {"_id": 0, "name": 1})
        result.append(ReviewResponse(
            id=review["id"],
            reviewer_id=review["reviewer_id"],
            reviewer_name=reviewer["name"] if reviewer else "Unknown",
            reviewee_id=review["reviewee_id"],
            rating=review["rating"],
            comment=review.get("comment"),
            created_at=review["created_at"]
        ))
    
    return result

# ============== STATS/DASHBOARD ENDPOINTS ==============
@api_router.get("/stats/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Get counts
    items_listed = await db.items.count_documents({"owner_id": current_user["id"]})
    items_bought = await db.orders.count_documents({"buyer_id": current_user["id"], "status": OrderStatus.COMPLETED.value})
    items_sold = await db.orders.count_documents({"seller_id": current_user["id"], "status": OrderStatus.COMPLETED.value})
    items_borrowed = await db.borrow_requests.count_documents({"borrower_id": current_user["id"], "status": {"$in": [BorrowStatus.ACTIVE.value, BorrowStatus.CLOSED.value]}})
    items_lent = await db.borrow_requests.count_documents({"lender_id": current_user["id"], "status": {"$in": [BorrowStatus.ACTIVE.value, BorrowStatus.CLOSED.value]}})
    
    # Calculate earnings
    sold_orders = await db.orders.find({"seller_id": current_user["id"], "status": OrderStatus.COMPLETED.value}, {"_id": 0, "amount": 1}).to_list(1000)
    sales_earnings = sum(o["amount"] for o in sold_orders)
    
    lent_borrows = await db.borrow_requests.find({"lender_id": current_user["id"], "status": BorrowStatus.CLOSED.value}, {"_id": 0, "rental_amount": 1}).to_list(1000)
    rental_earnings = sum(b["rental_amount"] for b in lent_borrows)
    
    return {
        "items_listed": items_listed,
        "items_bought": items_bought,
        "items_sold": items_sold,
        "items_borrowed": items_borrowed,
        "items_lent": items_lent,
        "sales_earnings": sales_earnings,
        "rental_earnings": rental_earnings,
        "total_earnings": sales_earnings + rental_earnings
    }

@api_router.get("/stats/featured-items", response_model=List[ItemResponse])
async def get_featured_items(current_user: dict = Depends(get_current_user)):
    items = await db.items.find(
        {"college_id": current_user["college_id"], "status": ItemStatus.AVAILABLE.value},
        {"_id": 0}
    ).sort("created_at", -1).limit(8).to_list(8)
    
    result = []
    for item in items:
        owner = await db.users.find_one({"id": item["owner_id"]}, {"_id": 0, "name": 1, "rating": 1})
        result.append(ItemResponse(
            **item,
            owner_name=owner["name"] if owner else "Unknown",
            owner_rating=owner.get("rating", 0.0) if owner else 0.0
        ))
    
    return result

# ============== USER PROFILE (PUBLIC) ==============
@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "student_id_image": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check same college
    if user["college_id"] != current_user["college_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    college = await db.colleges.find_one({"id": user["college_id"]}, {"_id": 0})
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user.get("phone"),
        college_id=user["college_id"],
        college_name=college["name"] if college else None,
        role=user["role"],
        status=user["status"],
        rating=user.get("rating", 0.0),
        total_reviews=user.get("total_reviews", 0),
        avatar_url=user.get("avatar_url"),
        created_at=user["created_at"]
    )

# ============== SEED DATA ==============
@api_router.post("/seed")
async def seed_data():
    """Seed initial colleges for testing"""
    colleges = [
        {"id": "col-1", "name": "Stanford University", "domain": "stanford.edu", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "col-2", "name": "MIT", "domain": "mit.edu", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "col-3", "name": "Harvard University", "domain": "harvard.edu", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "col-4", "name": "UC Berkeley", "domain": "berkeley.edu", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "col-5", "name": "UCLA", "domain": "ucla.edu", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    
    for college in colleges:
        existing = await db.colleges.find_one({"id": college["id"]})
        if not existing:
            await db.colleges.insert_one(college)
    
    return {"message": "Seed data created", "colleges": len(colleges)}

# ============== IMAGE UPLOAD ==============
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload an image and return its URL"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    with open(filepath, 'wb') as f:
        f.write(contents)
    
    # Return URL
    return {"url": f"/api/uploads/{filename}", "filename": filename}

@api_router.post("/upload/base64")
async def upload_base64_image(data: dict, current_user: dict = Depends(get_current_user)):
    """Upload an image as base64 and return its URL"""
    base64_data = data.get("image")
    if not base64_data:
        raise HTTPException(status_code=400, detail="No image data provided")
    
    # Remove data URL prefix if present
    if ',' in base64_data:
        base64_data = base64_data.split(',')[1]
    
    try:
        contents = base64.b64decode(base64_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data")
    
    # Check file size (max 5MB)
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    # Generate unique filename
    filename = f"{uuid.uuid4()}.jpg"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    with open(filepath, 'wb') as f:
        f.write(contents)
    
    return {"url": f"/api/uploads/{filename}", "filename": filename}

# ============== EMAIL NOTIFICATIONS ==============
async def send_email_async(to_email: str, subject: str, html_content: str):
    """Send email asynchronously using Resend"""
    if not RESEND_API_KEY:
        logger.info(f"[EMAIL MOCK] To: {to_email}, Subject: {subject}")
        return {"id": "mock", "status": "mocked"}
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}: {result}")
        return result
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return {"error": str(e)}

def get_welcome_email_html(name: str, college_name: str):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to Campus Store!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
            <p style="font-size: 16px; color: #334155;">Hi {name},</p>
            <p style="font-size: 16px; color: #334155;">
                Welcome to Campus Store at <strong>{college_name}</strong>! You're now part of your campus marketplace community.
            </p>
            <p style="font-size: 16px; color: #334155;">You can now:</p>
            <ul style="color: #334155;">
                <li>Buy and sell items with fellow students</li>
                <li>Borrow items you need temporarily</li>
                <li>List your items for rent and earn money</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                    Start Browsing
                </a>
            </div>
            <p style="font-size: 14px; color: #64748b;">Happy trading!</p>
        </div>
    </div>
    """

def get_borrow_request_email_html(lender_name: str, borrower_name: str, item_title: str, days: int, total_amount: float):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">New Borrow Request!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
            <p style="font-size: 16px; color: #334155;">Hi {lender_name},</p>
            <p style="font-size: 16px; color: #334155;">
                <strong>{borrower_name}</strong> wants to borrow your item:
            </p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #0f172a;">{item_title}</h3>
                <p style="margin: 5px 0; color: #64748b;">Duration: {days} days</p>
                <p style="margin: 5px 0; color: #f59e0b; font-weight: bold;">Total: ${total_amount:.2f}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                    Review Request
                </a>
            </div>
        </div>
    </div>
    """

def get_borrow_approved_email_html(borrower_name: str, item_title: str, lender_name: str, total_amount: float):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Request Approved!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
            <p style="font-size: 16px; color: #334155;">Hi {borrower_name},</p>
            <p style="font-size: 16px; color: #334155;">
                Great news! <strong>{lender_name}</strong> approved your request to borrow:
            </p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #0f172a;">{item_title}</h3>
                <p style="margin: 5px 0; color: #10b981; font-weight: bold;">Total to pay: ${total_amount:.2f}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">
                    Complete Payment
                </a>
            </div>
        </div>
    </div>
    """

def get_payment_success_email_html(user_name: str, item_title: str, amount: float, transaction_type: str):
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Payment Successful!</h1>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
            <p style="font-size: 16px; color: #334155;">Hi {user_name},</p>
            <p style="font-size: 16px; color: #334155;">
                Your payment has been processed successfully.
            </p>
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #0f172a;">{item_title}</h3>
                <p style="margin: 5px 0; color: #64748b;">Type: {transaction_type}</p>
                <p style="margin: 5px 0; color: #3b82f6; font-weight: bold;">Amount: ${amount:.2f}</p>
            </div>
            <p style="font-size: 14px; color: #64748b;">
                {'Coordinate with the seller to pick up your item.' if transaction_type == 'Purchase' else 'Coordinate with the lender to pick up your rental.'}
            </p>
        </div>
    </div>
    """

# ============== CHAT/MESSAGING ==============
class MessageCreate(BaseModel):
    receiver_id: str
    item_id: Optional[str] = None
    content: str

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    receiver_id: str
    receiver_name: str
    item_id: Optional[str] = None
    item_title: Optional[str] = None
    content: str
    read: bool = False
    created_at: str

class ConversationResponse(BaseModel):
    id: str
    participant_ids: List[str]
    participant_names: Dict[str, str]
    participant_avatars: Dict[str, str]
    item_id: Optional[str] = None
    item_title: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    unread_count: int = 0

@api_router.post("/messages", response_model=MessageResponse)
async def send_message(message: MessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a message to another user"""
    # Check receiver exists and is in same college
    receiver = await db.users.find_one({"id": message.receiver_id}, {"_id": 0})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    if receiver["college_id"] != current_user["college_id"]:
        raise HTTPException(status_code=403, detail="Can only message users from same college")
    if message.receiver_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    
    # Get or create conversation
    participant_ids = sorted([current_user["id"], message.receiver_id])
    conversation_query = {"participant_ids": participant_ids}
    if message.item_id:
        conversation_query["item_id"] = message.item_id
    
    conversation = await db.conversations.find_one(conversation_query, {"_id": 0})
    
    if not conversation:
        # Create new conversation
        item = None
        if message.item_id:
            item = await db.items.find_one({"id": message.item_id}, {"_id": 0, "title": 1})
        
        conversation = {
            "id": str(uuid.uuid4()),
            "participant_ids": participant_ids,
            "participant_names": {
                current_user["id"]: current_user["name"],
                message.receiver_id: receiver["name"]
            },
            "participant_avatars": {
                current_user["id"]: current_user.get("avatar_url", ""),
                message.receiver_id: receiver.get("avatar_url", "")
            },
            "item_id": message.item_id,
            "item_title": item["title"] if item else None,
            "college_id": current_user["college_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(conversation)
    
    # Create message
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    message_doc = {
        "id": message_id,
        "conversation_id": conversation["id"],
        "sender_id": current_user["id"],
        "receiver_id": message.receiver_id,
        "item_id": message.item_id,
        "content": message.content,
        "read": False,
        "created_at": now
    }
    await db.messages.insert_one(message_doc)
    
    # Update conversation with last message
    await db.conversations.update_one(
        {"id": conversation["id"]},
        {"$set": {
            "last_message": message.content[:100],
            "last_message_at": now
        }}
    )
    
    item = None
    if message.item_id:
        item = await db.items.find_one({"id": message.item_id}, {"_id": 0, "title": 1})
    
    return MessageResponse(
        id=message_id,
        conversation_id=conversation["id"],
        sender_id=current_user["id"],
        sender_name=current_user["name"],
        sender_avatar=current_user.get("avatar_url"),
        receiver_id=message.receiver_id,
        receiver_name=receiver["name"],
        item_id=message.item_id,
        item_title=item["title"] if item else None,
        content=message.content,
        read=False,
        created_at=now
    )

@api_router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get all conversations for current user"""
    conversations = await db.conversations.find(
        {"participant_ids": current_user["id"]},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(50)
    
    result = []
    for conv in conversations:
        # Count unread messages
        unread_count = await db.messages.count_documents({
            "conversation_id": conv["id"],
            "receiver_id": current_user["id"],
            "read": False
        })
        
        result.append(ConversationResponse(
            id=conv["id"],
            participant_ids=conv["participant_ids"],
            participant_names=conv.get("participant_names", {}),
            participant_avatars=conv.get("participant_avatars", {}),
            item_id=conv.get("item_id"),
            item_title=conv.get("item_title"),
            last_message=conv.get("last_message"),
            last_message_at=conv.get("last_message_at"),
            unread_count=unread_count
        ))
    
    return result

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(conversation_id: str, current_user: dict = Depends(get_current_user)):
    """Get all messages in a conversation"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user["id"] not in conversation["participant_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "receiver_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    result = []
    for msg in messages:
        sender = await db.users.find_one({"id": msg["sender_id"]}, {"_id": 0, "name": 1, "avatar_url": 1})
        receiver = await db.users.find_one({"id": msg["receiver_id"]}, {"_id": 0, "name": 1})
        item = None
        if msg.get("item_id"):
            item = await db.items.find_one({"id": msg["item_id"]}, {"_id": 0, "title": 1})
        
        result.append(MessageResponse(
            id=msg["id"],
            conversation_id=msg["conversation_id"],
            sender_id=msg["sender_id"],
            sender_name=sender["name"] if sender else "Unknown",
            sender_avatar=sender.get("avatar_url") if sender else None,
            receiver_id=msg["receiver_id"],
            receiver_name=receiver["name"] if receiver else "Unknown",
            item_id=msg.get("item_id"),
            item_title=item["title"] if item else None,
            content=msg["content"],
            read=msg.get("read", False),
            created_at=msg["created_at"]
        ))
    
    return result

@api_router.get("/messages/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get total unread message count"""
    count = await db.messages.count_documents({
        "receiver_id": current_user["id"],
        "read": False
    })
    return {"unread_count": count}

# Include router
app.include_router(api_router)

# Serve uploaded files
from fastapi.responses import FileResponse

@app.get("/api/uploads/{filename}")
async def serve_upload(filename: str):
    filepath = UPLOADS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
