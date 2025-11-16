from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from ..database.database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserResponse, LoginRequest, TokenResponse, RefreshTokenRequest
from ..core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from ..core.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя
    """
    print(f"\n=== REGISTER START ===")
    print(f"1. Received data: login={user_data.login}, email={user_data.email}")
    
    try:
        print(f"2. Checking if login exists...")
        existing_user = db.query(User).filter(User.login == user_data.login).first()
        if existing_user:
            print(f"3a. Login already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Login already registered"
            )
        
        print(f"3b. Checking if email exists...")
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            print(f"3c. Email already exists")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        print(f"4. Hashing password...")
        hashed_password = hash_password(user_data.password)
        print(f"5. Password hashed successfully")
        
        print(f"6. Creating user in database...")
        db_user = User(
            login=user_data.login,
            email=user_data.email,
            password_hash=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"7. User created: user_id={db_user.user_id}")
        
        print(f"8. Loading roles...")
        db.refresh(db_user, ["roles"])
        print(f"9. Roles loaded")
        
        print(f"10. Creating tokens...")
        access_token = create_access_token(data={"sub": str(db_user.user_id)})
        refresh_token = create_refresh_token(data={"sub": str(db_user.user_id)})
        print(f"11. Tokens created")
        
        result = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(db_user)
        )
        print(f"12. Response prepared")
        print(f"=== REGISTER SUCCESS ===\n")
        return result
    except HTTPException:
        print(f"HTTP Exception raised")
        raise
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(f"=== REGISTER FAILED ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )



@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """
    Вход пользователя в систему
    """
    print(f"\n=== LOGIN START ===")
    print(f"1. Login attempt: {login_data.login}")
    
    try:
        print(f"2. Querying user...")
        user = db.query(User).filter(User.login == login_data.login).first()
        
        if not user or not verify_password(login_data.password, user.salt, user.password_hash):
            print(f"3. Invalid credentials")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid login or password"
            )
        
        print(f"4. User found: user_id={user.user_id}")
        
        print(f"5. Loading roles...")
        db.refresh(user, ["roles"])
        print(f"6. Roles loaded")
        
        print(f"7. Creating tokens...")
        access_token = create_access_token(data={"sub": str(user.user_id)})
        refresh_token = create_refresh_token(data={"sub": str(user.user_id)})
        print(f"8. Tokens created: {access_token[:50]}...")
        
        result = TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user)
        )
        print(f"=== LOGIN SUCCESS ===\n")
        return result
    except HTTPException:
        print(f"HTTP Exception raised")
        raise
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(f"=== LOGIN FAILED ===\n")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )



@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Обновление access token с помощью refresh token
    """
    print(f"\n=== REFRESH START ===")
    
    payload = decode_token(refresh_data.refresh_token)
    
    if payload is None or payload.get("type") != "refresh":
        print(f"Invalid refresh token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id_str = payload.get("sub")
    print(f"1. Refresh for user_id: {user_id_str}")
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        print(f"Invalid user_id format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user:
        print(f"User not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    print(f"2. User found: {user.login}")
    
    db.refresh(user, ["roles"])
    
    access_token = create_access_token(data={"sub": str(user.user_id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.user_id)})
    
    print(f"=== REFRESH SUCCESS ===\n")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )



@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Получить информацию о текущем пользователе
    """
    return UserResponse.model_validate(current_user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """
    Выход из системы (токен инвалидируется на фронте)
    """
    return {"message": "Successfully logged out"}

