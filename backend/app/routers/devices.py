from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import secrets
import hashlib
from app.database import get_db
from app.models import EdgeDevice, User
from app.schemas import EdgeDeviceInDB
from app.deps import get_current_active_user
from pydantic import BaseModel

router = APIRouter()


class DeviceCreateRequest(BaseModel):
    name: str


class DeviceCreateResponse(BaseModel):
    id: int
    name: str
    token: str
    created_at: datetime


class DeviceStatusResponse(BaseModel):
    id: int
    name: str
    last_seen: Optional[datetime] = None
    created_at: datetime
    is_online: bool


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@router.get("/", response_model=List[DeviceStatusResponse])
async def list_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    devices = db.query(EdgeDevice).all()
    results = []
    now = datetime.now(timezone.utc)
    for d in devices:
        is_online = False
        if d.last_seen:
            diff = now - (d.last_seen if d.last_seen.tzinfo else d.last_seen.replace(tzinfo=timezone.utc))
            if diff < timedelta(seconds=45):
                is_online = True
        results.append(DeviceStatusResponse(
            id=d.id,
            name=d.name,
            last_seen=d.last_seen,
            created_at=d.created_at,
            is_online=is_online
        ))
    return results


@router.post("/", response_model=DeviceCreateResponse)
async def register_device(
    payload: DeviceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    raw_token = f"edge_{secrets.token_hex(24)}"
    token_hash = hash_token(raw_token)

    device = EdgeDevice(
        name=payload.name,
        token=token_hash,
        created_at=datetime.now(timezone.utc)
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    return DeviceCreateResponse(
        id=device.id,
        name=device.name,
        token=raw_token,
        created_at=device.created_at
    )


@router.delete("/{device_id}")
async def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    device = db.query(EdgeDevice).filter(EdgeDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"status": "success", "message": f"Device {device_id} deleted"}


@router.post("/ping")
async def ping_device(
    x_device_token: str = Header(..., alias="X-Device-Token"),
    db: Session = Depends(get_db)
):
    token_hash = hash_token(x_device_token)
    device = db.query(EdgeDevice).filter(EdgeDevice.token == token_hash).first()
    if not device:
        # Fallback to direct token match if unhashed
        device = db.query(EdgeDevice).filter(EdgeDevice.token == x_device_token).first()
    
    if not device:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid edge device token")

    device.last_seen = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok", "device": device.name, "timestamp": device.last_seen.isoformat()}
