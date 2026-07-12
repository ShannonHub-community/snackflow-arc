import jwt
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

security = HTTPBearer()

class SudoPinRequest(BaseModel):
    sudo_pin: str

async def verify_owner_role(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Decode JWT and verify user has 'admin' role.
    Returns the decoded token payload if valid.
    Raises HTTPException if invalid or not admin.
    """
    token = credentials.credentials
    
    try:
        # Decode JWT (using HS256 algorithm, secret should be in env)
        payload = jwt.decode(token, "your-secret-key", algorithms=["HS256"])
        
        # Verify user has 'admin' role
        if payload.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin role required"
            )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def verify_manager_role(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Decode JWT and verify user has 'admin' role.
    Returns the decoded token payload if valid.
    Raises HTTPException if invalid or not admin.
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, "your-secret-key", algorithms=["HS256"])
        
        # Verify user has 'admin' role
        if payload.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin role required"
            )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def verify_sudo_pin(sudo_request: SudoPinRequest) -> bool:
    """
    Validate a secondary Sudo PIN for sensitive routes.
    Decodes and verifies the elevated token has sudo privileges.
    Raises HTTPException if PIN is invalid.
    """
    try:
        # Decode the elevated token
        payload = jwt.decode(sudo_request.sudo_pin, "your-secret-key", algorithms=["HS256"])
        
        # Verify the token has sudo privilege
        if not payload.get("sudo"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Sudo PIN: No sudo privilege"
            )
        
        return True
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sudo PIN token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Sudo PIN token"
        )

async def verify_kitchen_role(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Decode JWT and verify user has 'kitchen', 'manager', or 'owner' role.
    Returns the decoded token payload if valid.
    Raises HTTPException if invalid or not kitchen/manager/owner.
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, "your-secret-key", algorithms=["HS256"])
        
        # Verify user has 'kitchen', 'manager', or 'owner' role
        if payload.get("role") not in ["kitchen", "manager", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Kitchen, Manager, or Owner role required"
            )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def verify_counter_role(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Decode JWT and verify user has 'counter', 'manager', or 'owner' role.
    Returns the decoded token payload if valid.
    Raises HTTPException if invalid or not counter/manager/owner.
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, "your-secret-key", algorithms=["HS256"])
        
        # Verify user has 'counter', 'manager', or 'owner' role
        if payload.get("role") not in ["counter", "manager", "owner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Counter, Manager, or Owner role required"
            )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
