from pydantic import BaseModel, validator, Field
from typing import Optional
import re

class StoreConfig(BaseModel):
    store_name: str
    address: str
    auto_open: str  # Time format: "HH:MM"
    auto_close: str  # Time format: "HH:MM"
    phone: Optional[str] = None
    email: Optional[str] = None
    currency: str = "INR"
    tax_rate: float = Field(default=0.0, ge=0, le=100)

class MenuItemBase(BaseModel):
    name: str
    price: float = Field(gt=0, description="Price must be a positive number")
    category: str
    station: str
    icon: str
    is_available: bool = True
    description: Optional[str] = None
    
    @validator('name')
    def strip_html_tags(cls, v):
        """Strip HTML tags from item name for security."""
        if v:
            # Remove HTML tags using regex
            clean = re.sub(r'<[^>]+>', '', v)
            return clean.strip()
        return v

class MenuItemCreate(MenuItemBase):
    id: str

class MenuItemUpdate(MenuItemBase):
    pass

class MenuItemResponse(MenuItemBase):
    id: str
    is_active: bool = True
