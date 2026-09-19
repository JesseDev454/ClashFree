from fastapi import APIRouter, Depends

from app.api.auth import serialize_user
from app.api.deps import get_current_user
from app.models.identity import User
from app.schemas.auth import UserOut

router = APIRouter(prefix="/api", tags=["me"])


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return serialize_user(user)
