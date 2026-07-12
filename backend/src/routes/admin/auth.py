from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import random
import time
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Mock password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Simple in-memory OTP cache (username -> {"otp": str, "timestamp": float})
otp_cache = {}

# Mock user database (to be replaced with Supabase)
# Pre-computed hashes to avoid bcrypt 72-byte limit issue during module load
MOCK_USERS = {
    "admin": {
        "username": "admin",
        "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY8WqWq5q3i",  # bcrypt hash of "admin123"
        "user_id": "owner123",
        "role": "admin"
    },
    "manager1": {
        "username": "manager1",
        "pin_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW",  # bcrypt hash of "1234"
        "user_id": "123",
        "role": "manager",
        "store_code": "CAFE-882"
    }
}

# Mock Sudo PIN hash (to be replaced with actual storage)
MOCK_SUDO_PIN_HASH = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW"  # bcrypt hash of "1234"

class OwnerLoginRequest(BaseModel):
    username: str
    password: str

class OwnerLoginResponse(BaseModel):
    success: bool
    message: str

class VerifyOtpRequest(BaseModel):
    username: str
    otp: str

class VerifyOtpResponse(BaseModel):
    success: bool
    token: str | None = None
    message: str

class SudoPinRequest(BaseModel):
    pin: str

class SudoPinResponse(BaseModel):
    success: bool
    elevated_token: str | None = None
    message: str

class StaffLoginRequest(BaseModel):
    username: str
    pin: str

class StaffLoginResponse(BaseModel):
    success: bool
    token: str | None = None
    message: str

@router.post("/owner/login", response_model=OwnerLoginResponse)
async def owner_login(request: OwnerLoginRequest):
    """
    Owner login endpoint.
    Accepts username/password, verifies credentials, generates 6-digit OTP,
    stores it in cache with timestamp, and returns success message.
    Returns 401 on authentication failure.
    """
    # Mock DB lookup
    user = MOCK_USERS.get(request.username)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Mock bcrypt verification
    if not pwd_context.verify(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    
    # Store OTP in cache with timestamp (5 minute expiry)
    otp_cache[request.username] = {
        "otp": otp,
        "timestamp": time.time()
    }
    
    # TODO: Trigger email gateway with OTP (not implemented yet)
    
    return OwnerLoginResponse(
        success=True,
        message=f"OTP sent successfully (mock OTP: {otp})"
    )

@router.post("/owner/verify-otp", response_model=VerifyOtpResponse)
async def verify_otp(request: VerifyOtpRequest):
    """
    Verify OTP and generate JWT token.
    Accepts username and OTP, validates against cache,
    and returns JWT with payload { "user_id": "owner123", "role": "admin" }.
    """
    # Check if OTP exists in cache
    cached_data = otp_cache.get(request.username)
    
    if not cached_data:
        return VerifyOtpResponse(
            success=False,
            message="OTP not found or expired"
        )
    
    # Check OTP expiry (5 minutes)
    if time.time() - cached_data["timestamp"] > 300:
        del otp_cache[request.username]
        return VerifyOtpResponse(
            success=False,
            message="OTP expired"
        )
    
    # Verify OTP
    if cached_data["otp"] != request.otp:
        return VerifyOtpResponse(
            success=False,
            message="Invalid OTP"
        )
    
    # Clear OTP from cache after successful verification
    del otp_cache[request.username]
    
    # Get user data
    user = MOCK_USERS.get(request.username)
    if not user:
        return VerifyOtpResponse(
            success=False,
            message="User not found"
        )
    
    # Generate JWT token
    token = jwt.encode(
        {
            "user_id": user["user_id"],
            "role": user["role"],
            "sub": request.username
        },
        "your-secret-key",
        algorithm="HS256"
    )
    
    return VerifyOtpResponse(
        success=True,
        token=token,
        message="Authentication successful"
    )

@router.post("/sudo-pin", response_model=SudoPinResponse)
async def verify_sudo_pin(request: SudoPinRequest):
    """
    Verify Sudo PIN and return elevated token or success flag.
    Mock bcrypt verification.
    """
    # Mock bcrypt verification
    if not pwd_context.verify(request.pin, MOCK_SUDO_PIN_HASH):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Sudo PIN"
        )
    
    # Generate elevated token with sudo privilege
    elevated_token = jwt.encode(
        {
            "sudo": True,
            "timestamp": time.time()
        },
        "your-secret-key",
        algorithm="HS256"
    )
    
    return SudoPinResponse(
        success=True,
        elevated_token=elevated_token,
        message="Sudo PIN verified successfully"
    )

@router.post("/staff/login", response_model=StaffLoginResponse)
async def staff_login(request: StaffLoginRequest):
    """
    Staff login endpoint.
    Accepts username/PIN, verifies credentials with mock bcrypt,
    and returns JWT with payload { 'user_id': '123', 'role': 'manager', 'store_code': 'CAFE-882' }.
    Returns 401 on authentication failure.
    """
    # Mock DB lookup
    user = MOCK_USERS.get(request.username)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Mock bcrypt PIN verification
    if not pwd_context.verify(request.pin, user.get("pin_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Generate JWT token
    token = jwt.encode(
        {
            "user_id": user["user_id"],
            "role": user["role"],
            "store_code": user.get("store_code"),
            "sub": request.username
        },
        "your-secret-key",
        algorithm="HS256"
    )
    
    return StaffLoginResponse(
        success=True,
        token=token,
        message="Login successful"
    )
