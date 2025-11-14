import os
from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from src.database import get_db, init_db, Vendor as DBVendor

load_dotenv()
app = FastAPI(title="Vendors Service", version="1.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-jwt-key-change-in-production")
ALGORITHM = "HS256"

class VendorCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    eventId: str

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    eventId: Optional[str] = None

class VendorResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    eventId: str
    class Config:
        from_attributes = True

def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization token missing")
    token = authorization[7:]
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_role(*roles):
    def dependency(user=Depends(verify_token)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return dependency

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "vendors"}

@app.get("/v1/vendors", response_model=list[VendorResponse])
async def list_vendors(user=Depends(verify_token), db: Session = Depends(get_db)):
    vendors = db.query(DBVendor).all()
    return [VendorResponse(id=str(v.id), name=v.name, email=v.email, phone=v.phone, eventId=v.event_id) for v in vendors]

@app.post("/v1/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(vendor_data: VendorCreate, user=Depends(require_role("admin", "organizer")), db: Session = Depends(get_db)):
    existing = db.query(DBVendor).filter(DBVendor.email == vendor_data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vendor already exists with same email")
    new_vendor = DBVendor(name=vendor_data.name, email=vendor_data.email, phone=vendor_data.phone, event_id=vendor_data.eventId)
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)
    return VendorResponse(id=str(new_vendor.id), name=new_vendor.name, email=new_vendor.email, phone=new_vendor.phone, eventId=new_vendor.event_id)

@app.get("/v1/vendors/{id}", response_model=VendorResponse)
async def get_vendor(id: int, user=Depends(verify_token), db: Session = Depends(get_db)):
    vendor = db.query(DBVendor).filter(DBVendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return VendorResponse(id=str(vendor.id), name=vendor.name, email=vendor.email, phone=vendor.phone, eventId=vendor.event_id)

@app.patch("/v1/vendors/{id}", response_model=VendorResponse)
async def update_vendor(id: int, vendor_data: VendorUpdate, user=Depends(require_role("admin", "organizer")), db: Session = Depends(get_db)):
    vendor = db.query(DBVendor).filter(DBVendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    if vendor_data.name: vendor.name = vendor_data.name
    if vendor_data.email:
        existing = db.query(DBVendor).filter(DBVendor.email == vendor_data.email, DBVendor.id != id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists for another vendor")
        vendor.email = vendor_data.email
    if vendor_data.phone is not None: vendor.phone = vendor_data.phone
    if vendor_data.eventId: vendor.event_id = vendor_data.eventId
    db.commit()
    db.refresh(vendor)
    return VendorResponse(id=str(vendor.id), name=vendor.name, email=vendor.email, phone=vendor.phone, eventId=vendor.event_id)

@app.delete("/v1/vendors/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(id: int, user=Depends(require_role("admin", "organizer")), db: Session = Depends(get_db)):
    vendor = db.query(DBVendor).filter(DBVendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    db.delete(vendor)
    db.commit()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8003))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
