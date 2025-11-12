"""Auth Service - JWT-based authentication with FastAPI."""
import os
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
import jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from src.database import get_db, init_db, User as DBUser, UserRole

load_dotenv()

app = FastAPI(title="Auth Service", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.ATTENDEE

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    token: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    class Config:
        from_attributes = True

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> DBUser:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        user = db.query(DBUser).filter(DBUser.id == int(user_id)).first()
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "auth"}

@app.post("/v1/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    hashed_password = get_password_hash(user_data.password)
    new_user = DBUser(email=user_data.email, password_hash=hashed_password, role=user_data.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse(id=str(new_user.id), email=new_user.email, role=new_user.role.value)

@app.post("/v1/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
    return Token(token=access_token)

@app.get("/v1/auth/me", response_model=UserResponse)
async def get_me(current_user: DBUser = Depends(get_current_user)):
    return UserResponse(id=str(current_user.id), email=current_user.email, role=current_user.role.value)

@app.get("/v1/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    """Get user information by ID - used internally by other services"""
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(id=str(user.id), email=user.email, role=user.role.value)

@app.get("/v1/auth/users/search", response_model=UserResponse)
async def search_user_by_email(email: str, db: Session = Depends(get_db)):
    """Search user by email - used internally by other services"""
    user = db.query(DBUser).filter(DBUser.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse(id=str(user.id), email=user.email, role=user.role.value)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
