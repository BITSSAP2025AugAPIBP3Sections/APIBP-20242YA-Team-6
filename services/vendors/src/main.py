import os
from fastapi import FastAPI, HTTPException, Depends, status, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional, Any
import jwt
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, asc, desc
from dotenv import load_dotenv
from src.database import get_db, init_db, Vendor as DBVendor
import math

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

class PaginatedVendorResponse(BaseModel):
    vendors: List[Dict[str, Any]]  # Changed from List[VendorResponse] to support field selection
    pagination: Dict[str, Any]
    filters: Optional[Dict[str, Any]] = None
    sorting: Optional[Dict[str, str]] = None

class VendorFilter(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    eventId: Optional[str] = None
    search: Optional[str] = None

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

def apply_filters(query, filters: VendorFilter):
    """Apply filters to the database query."""
    if filters.name:
        query = query.filter(DBVendor.name.ilike(f"%{filters.name}%"))
    if filters.email:
        query = query.filter(DBVendor.email.ilike(f"%{filters.email}%"))
    if filters.phone:
        query = query.filter(DBVendor.phone.ilike(f"%{filters.phone}%"))
    if filters.eventId:
        query = query.filter(DBVendor.event_id.ilike(f"%{filters.eventId}%"))
    if filters.search:
        search_term = f"%{filters.search}%"
        query = query.filter(or_(
            DBVendor.name.ilike(search_term),
            DBVendor.email.ilike(search_term),
            DBVendor.phone.ilike(search_term),
            DBVendor.event_id.ilike(search_term)
        ))
    return query

def apply_sorting(query, sort_by: str, sort_order: str):
    """Apply sorting to the database query."""
    valid_fields = ['id', 'name', 'email', 'phone', 'eventId']
    if sort_by not in valid_fields:
        raise HTTPException(status_code=400, detail=f"Invalid sort field. Must be one of: {valid_fields}")
    
    field_mapping = {
        'id': DBVendor.id,
        'name': DBVendor.name,
        'email': DBVendor.email,
        'phone': DBVendor.phone,
        'eventId': DBVendor.event_id
    }
    
    column = field_mapping[sort_by]
    if sort_order.lower() == 'desc':
        query = query.order_by(desc(column))
    else:
        query = query.order_by(asc(column))
    
    return query

def select_fields(vendor_data: dict, fields: List[str]) -> dict:
    """Select only specified fields from vendor data."""
    if not fields:
        return vendor_data
    
    valid_fields = ['id', 'name', 'email', 'phone', 'eventId']
    invalid_fields = [f for f in fields if f not in valid_fields]
    if invalid_fields:
        raise HTTPException(status_code=400, detail=f"Invalid fields: {invalid_fields}. Valid fields: {valid_fields}")
    
    return {field: vendor_data[field] for field in fields if field in vendor_data}

def build_pagination_info(page: int, page_size: int, total_count: int) -> dict:
    """Build pagination information."""
    total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
    has_next = page < total_pages
    has_prev = page > 1
    
    return {
        "current_page": page,
        "page_size": page_size,
        "total_count": total_count,
        "total_pages": total_pages,
        "has_next": has_next,
        "has_previous": has_prev,
        "next_page": page + 1 if has_next else None,
        "previous_page": page - 1 if has_prev else None
    }

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "vendors"}

@app.get("/v1/vendors", response_model=PaginatedVendorResponse)
async def list_vendors(
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of vendors per page"),
    sort_by: str = Query("id", description="Field to sort by (id, name, email, phone, eventId)"),
    sort_order: str = Query("asc", regex="^(asc|desc)$", description="Sort order (asc or desc)"),
    fields: Optional[str] = Query(None, description="Comma-separated list of fields to return"),
    name: Optional[str] = Query(None, description="Filter by vendor name (partial match)"),
    email: Optional[str] = Query(None, description="Filter by vendor email (partial match)"),
    phone: Optional[str] = Query(None, description="Filter by vendor phone (partial match)"),
    eventId: Optional[str] = Query(None, description="Filter by event ID (partial match)"),
    search: Optional[str] = Query(None, description="Global search across all text fields"),
    user=Depends(verify_token),
    db: Session = Depends(get_db)
):
    # Only organizers and admins can view vendors
    if user.get("role") not in ["admin", "organizer"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only organizers and admins can view vendors")
    """
    List vendors with advanced filtering, sorting, pagination, and field selection.
    
    Features:
    - Pagination: Use 'page' and 'page_size' parameters
    - Sorting: Use 'sort_by' and 'sort_order' parameters
    - Filtering: Use individual field filters or 'search' for global search
    - Field Selection: Use 'fields' parameter to specify which fields to return
    """
    # Parse field selection
    selected_fields = None
    if fields:
        selected_fields = [f.strip() for f in fields.split(",") if f.strip()]
    
    # Build filters
    filters = VendorFilter(
        name=name,
        email=email,
        phone=phone,
        eventId=eventId,
        search=search
    )
    
    # Start building the query
    query = db.query(DBVendor)
    
    # Apply filters
    query = apply_filters(query, filters)
    
    # Get total count for pagination
    total_count = query.count()
    
    # Apply sorting
    query = apply_sorting(query, sort_by, sort_order)
    
    # Apply pagination
    offset = (page - 1) * page_size
    vendors = query.offset(offset).limit(page_size).all()
    
    # Convert to response format
    vendor_responses = []
    for v in vendors:
        vendor_data = {
            "id": str(v.id),
            "name": v.name,
            "email": v.email,
            "phone": v.phone,
            "eventId": v.event_id
        }
        
        # Apply field selection if specified
        if selected_fields:
            vendor_data = select_fields(vendor_data, selected_fields)
        
        vendor_responses.append(vendor_data)
    
    # Build response
    pagination_info = build_pagination_info(page, page_size, total_count)
    
    # Include applied filters and sorting in response
    applied_filters = {}
    if name: applied_filters["name"] = name
    if email: applied_filters["email"] = email
    if phone: applied_filters["phone"] = phone
    if eventId: applied_filters["eventId"] = eventId
    if search: applied_filters["search"] = search
    
    sorting_info = {
        "sort_by": sort_by,
        "sort_order": sort_order
    }
    
    return PaginatedVendorResponse(
        vendors=vendor_responses,
        pagination=pagination_info,
        filters=applied_filters if applied_filters else None,
        sorting=sorting_info
    )

@app.post("/v1/vendors", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(vendor_data: VendorCreate, user=Depends(require_role("admin", "organizer")), db: Session = Depends(get_db)):
    # Organizers can only create vendors for their own events
    if user.get("role") == "organizer":
        import httpx
        async with httpx.AsyncClient() as client:
            try:
                event_response = await client.get(
                    f"http://events-service:8002/v1/events/{vendor_data.eventId}",
                    headers={"Authorization": f"Bearer {jwt.encode({'sub': user['sub'], 'role': user['role']}, SECRET_KEY, algorithm=ALGORITHM)}"}
                )
                event_data = event_response.json()
                if event_data.get("organizerId") != user.get("sub"):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only create vendors for your own events")
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
                raise
    
    existing = db.query(DBVendor).filter(DBVendor.email == vendor_data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vendor already exists with same email")
    new_vendor = DBVendor(name=vendor_data.name, email=vendor_data.email, phone=vendor_data.phone, event_id=vendor_data.eventId)
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)
    return VendorResponse(id=str(new_vendor.id), name=new_vendor.name, email=new_vendor.email, phone=new_vendor.phone, eventId=new_vendor.event_id)

@app.get("/v1/vendors/{id}")
async def get_vendor(
    id: int,
    fields: Optional[str] = Query(None, description="Comma-separated list of fields to return"),
    user=Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Get a specific vendor with optional field selection.
    
    Features:
    - Field Selection: Use 'fields' parameter to specify which fields to return
    """
    vendor = db.query(DBVendor).filter(DBVendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    vendor_data = {
        "id": str(vendor.id),
        "name": vendor.name,
        "email": vendor.email,
        "phone": vendor.phone,
        "eventId": vendor.event_id
    }
    
    # Apply field selection if specified
    if fields:
        selected_fields = [f.strip() for f in fields.split(",") if f.strip()]
        vendor_data = select_fields(vendor_data, selected_fields)
    
    return vendor_data

@app.patch("/v1/vendors/{id}", response_model=VendorResponse)
async def update_vendor(id: int, vendor_data: VendorUpdate, user=Depends(require_role("admin", "organizer")), db: Session = Depends(get_db)):
    vendor = db.query(DBVendor).filter(DBVendor.id == id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    
    # Organizers can only update vendors for their own events
    if user.get("role") == "organizer":
        import httpx
        async with httpx.AsyncClient() as client:
            try:
                event_response = await client.get(
                    f"http://events-service:8002/v1/events/{vendor.event_id}",
                    headers={"Authorization": f"Bearer {jwt.encode({'sub': user['sub'], 'role': user['role']}, SECRET_KEY, algorithm=ALGORITHM)}"}
                )
                event_data = event_response.json()
                if event_data.get("organizerId") != user.get("sub"):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update vendors for your own events")
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
                raise
    
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
    
    # Organizers can only delete vendors for their own events
    if user.get("role") == "organizer":
        import httpx
        async with httpx.AsyncClient() as client:
            try:
                event_response = await client.get(
                    f"http://events-service:8002/v1/events/{vendor.event_id}",
                    headers={"Authorization": f"Bearer {jwt.encode({'sub': user['sub'], 'role': user['role']}, SECRET_KEY, algorithm=ALGORITHM)}"}
                )
                event_data = event_response.json()
                if event_data.get("organizerId") != user.get("sub"):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete vendors for your own events")
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
                raise
    
    db.delete(vendor)
    db.commit()




if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8003))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
