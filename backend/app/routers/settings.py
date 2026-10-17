from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Settings as SettingsModel, User
from app.schemas import SettingBase, SettingCreate, SettingUpdate, SettingInDB
from app.deps import get_current_active_user
from app.config import settings
import json


router = APIRouter()


@router.get("/", response_model=List[SettingInDB])
async def read_settings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    settings = db.query(SettingsModel).offset(skip).limit(limit).all()
    return settings


@router.get("/{key}", response_model=SettingInDB)
async def read_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    setting = db.query(SettingsModel).filter(SettingsModel.key == key).first()
    if setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.post("/", response_model=SettingInDB)
async def create_setting(
    setting: SettingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if setting already exists
    db_setting = db.query(SettingsModel).filter(SettingsModel.key == setting.key).first()
    if db_setting:
        raise HTTPException(status_code=400, detail="Setting already exists")
    db_setting = SettingsModel(**setting.dict())
    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting


@router.put("/{key}", response_model=SettingInDB)
async def update_setting(
    key: str,
    setting_update: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_setting = db.query(SettingsModel).filter(SettingsModel.key == key).first()
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    update_data = setting_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_setting, key, value)
    db.commit()
    db.refresh(db_setting)
    return db_setting


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_setting(
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_setting = db.query(SettingsModel).filter(SettingsModel.key == key).first()
    if db_setting is None:
        raise HTTPException(status_code=404, detail="Setting not found")
    db.delete(db_setting)
    db.commit()
    return None


# Helper to get setting value (for internal use)
def get_setting_value(db: Session, key: str, default: Optional[str] = None) -> Optional[str]:
    setting = db.query(SettingsModel).filter(SettingsModel.key == key).first()
    return setting.value if setting else default