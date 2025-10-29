#!/usr/bin/env python3
"""
TCRT 認證整合概念驗證測試腳本

此腳本測試與 TCRT (Test Case Repository Tool) 認證系統的整合，
驗證能否使用 TCRT 已建立的使用者進行登入。

測試項目：
1. 連接 TCRT 資料庫並讀取使用者資料
2. 呼叫 TCRT 的登入 API 取得 token
3. 使用 token 驗證身份並取得使用者資訊
4. 測試 token 刷新機制
"""

import sqlite3
import requests
import json
import sys
from typing import Optional, Dict, Any
from datetime import datetime

# TCRT 設定
TCRT_DB_PATH = "/Users/hideman/code/test_case_repo_tool_with_permission/test_case_repo.db"
TCRT_API_BASE_URL = "http://localhost:9999/api"

class TCRTAuthIntegrationTest:
    """TCRT 認證整合測試類別"""
    
    def __init__(self):
        self.db_path = TCRT_DB_PATH
        self.api_base = TCRT_API_BASE_URL
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        
    def print_section(self, title: str):
        """列印區段標題"""
        print("\n" + "=" * 60)
        print(f"  {title}")
        print("=" * 60)
    
    def test_1_database_connection(self) -> bool:
        """測試 1: 連接 TCRT 資料庫並讀取使用者"""
        self.print_section("測試 1: 連接 TCRT 資料庫")
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 查詢所有活動使用者
            cursor.execute("""
                SELECT id, username, email, role, is_active, 
                       created_at, last_login_at, full_name
                FROM users 
                WHERE is_active = 1
                ORDER BY id
            """)
            
            users = cursor.fetchall()
            
            print(f"✓ 成功連接資料庫: {self.db_path}")
            print(f"✓ 找到 {len(users)} 個活動使用者:\n")
            
            for user in users:
                print(f"  ID: {user['id']}")
                print(f"  Username: {user['username']}")
                print(f"  Email: {user['email'] or 'N/A'}")
                print(f"  Role: {user['role']}")
                print(f"  Full Name: {user['full_name'] or 'N/A'}")
                print(f"  Created: {user['created_at']}")
                print(f"  Last Login: {user['last_login_at'] or 'Never'}")
                print()
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"✗ 資料庫連接失敗: {e}")
            return False
    
    def test_2_login_with_tcrt_user(self, username: str, password: str) -> bool:
        """測試 2: 使用 TCRT 使用者登入"""
        self.print_section(f"測試 2: 使用 TCRT 使用者登入 ({username})")
        
        try:
            # 步驟 1: 取得登入 challenge
            print("步驟 1: 取得登入 challenge...")
            challenge_response = self.session.post(
                f"{self.api_base}/auth/challenge",
                json={"username_or_email": username}
            )
            
            if challenge_response.status_code != 200:
                print(f"✗ Challenge 請求失敗: {challenge_response.status_code}")
                print(f"  Response: {challenge_response.text}")
                return False
            
            challenge_data = challenge_response.json()
            print(f"✓ 成功取得 challenge: {challenge_data['challenge'][:20]}...")
            print(f"  Supports encryption: {challenge_data.get('supports_encryption', False)}")
            
            # 步驟 2: 使用明文密碼登入（相容模式）
            print("\n步驟 2: 使用明文密碼登入...")
            login_response = self.session.post(
                f"{self.api_base}/auth/login",
                json={
                    "username_or_email": username,
                    "password": password
                }
            )
            
            if login_response.status_code != 200:
                print(f"✗ 登入失敗: {login_response.status_code}")
                print(f"  Response: {login_response.text}")
                return False
            
            login_data = login_response.json()
            self.access_token = login_data['access_token']
            
            print(f"✓ 登入成功!")
            print(f"  Token: {self.access_token[:50]}...")
            print(f"  Token Type: {login_data['token_type']}")
            print(f"  Expires In: {login_data['expires_in']} 秒")
            print(f"  User Info:")
            for key, value in login_data['user_info'].items():
                print(f"    {key}: {value}")
            
            return True
            
        except Exception as e:
            print(f"✗ 登入過程發生錯誤: {e}")
            return False
    
    def test_3_verify_token(self) -> bool:
        """測試 3: 驗證 token 並取得使用者資訊"""
        self.print_section("測試 3: 驗證 Token")
        
        if not self.access_token:
            print("✗ 沒有可用的 access token")
            return False
        
        try:
            # 設定 Authorization header
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            
            # 取得目前使用者資訊
            response = self.session.get(
                f"{self.api_base}/auth/me",
                headers=headers
            )
            
            if response.status_code != 200:
                print(f"✗ Token 驗證失敗: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
            
            user_info = response.json()
            
            print("✓ Token 驗證成功!")
            print(f"  使用者資訊:")
            print(f"    User ID: {user_info['user_id']}")
            print(f"    Username: {user_info['username']}")
            print(f"    Email: {user_info.get('email', 'N/A')}")
            print(f"    Full Name: {user_info.get('full_name', 'N/A')}")
            print(f"    Role: {user_info['role']}")
            print(f"    Active: {user_info['is_active']}")
            
            if 'permissions' in user_info:
                print(f"    Permissions: {json.dumps(user_info['permissions'], indent=6)}")
            
            if 'accessible_teams' in user_info:
                print(f"    Accessible Teams: {user_info['accessible_teams']}")
            
            return True
            
        except Exception as e:
            print(f"✗ Token 驗證過程發生錯誤: {e}")
            return False
    
    def test_4_validate_token_endpoint(self) -> bool:
        """測試 4: 使用 validate-token endpoint"""
        self.print_section("測試 4: Token 驗證 Endpoint")
        
        if not self.access_token:
            print("✗ 沒有可用的 access token")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            
            response = self.session.post(
                f"{self.api_base}/auth/validate-token",
                headers=headers
            )
            
            if response.status_code != 200:
                print(f"✗ Token 驗證失敗: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
            
            validation_data = response.json()
            
            print("✓ Token 有效!")
            print(f"  Valid: {validation_data['valid']}")
            print(f"  User ID: {validation_data['user_id']}")
            print(f"  Username: {validation_data['username']}")
            print(f"  Role: {validation_data['role']}")
            print(f"  JTI: {validation_data['jti']}")
            
            return True
            
        except Exception as e:
            print(f"✗ Token 驗證過程發生錯誤: {e}")
            return False
    
    def test_5_logout(self) -> bool:
        """測試 5: 登出並撤銷 token"""
        self.print_section("測試 5: 登出")
        
        if not self.access_token:
            print("✗ 沒有可用的 access token")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            
            response = self.session.post(
                f"{self.api_base}/auth/logout",
                headers=headers
            )
            
            if response.status_code != 200:
                print(f"✗ 登出失敗: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
            
            logout_data = response.json()
            
            print(f"✓ 登出成功: {logout_data['message']}")
            
            # 驗證 token 已被撤銷
            print("\n驗證 token 是否已被撤銷...")
            verify_response = self.session.get(
                f"{self.api_base}/auth/me",
                headers=headers
            )
            
            if verify_response.status_code == 401:
                print("✓ Token 已成功撤銷 (401 Unauthorized)")
                return True
            else:
                print(f"✗ Token 仍然有效 (status: {verify_response.status_code})")
                return False
            
        except Exception as e:
            print(f"✗ 登出過程發生錯誤: {e}")
            return False
    
    def test_6_integration_summary(self) -> Dict[str, Any]:
        """測試 6: 整合建議總結"""
        self.print_section("測試 6: 整合建議總結")
        
        summary = {
            "database_schema": {
                "compatible": True,
                "notes": "TCRT 使用 SQLite，包含完整的使用者資料表"
            },
            "authentication_flow": {
                "supported_methods": [
                    "Challenge-Response (加密)",
                    "明文密碼 (相容模式)"
                ],
                "token_type": "JWT Bearer Token",
                "token_storage": "Session Service (記憶體 + 資料庫)"
            },
            "integration_approaches": [
                {
                    "approach": "共享資料庫",
                    "description": "User Story Map Tool 直接連接 TCRT 的資料庫讀取使用者",
                    "pros": [
                        "簡單直接",
                        "無需額外 API 呼叫",
                        "即時資料同步"
                    ],
                    "cons": [
                        "緊耦合",
                        "需要資料庫存取權限",
                        "無法使用 TCRT 的認證邏輯"
                    ]
                },
                {
                    "approach": "API 整合 (推薦)",
                    "description": "User Story Map Tool 呼叫 TCRT 的認證 API",
                    "pros": [
                        "鬆耦合",
                        "使用 TCRT 完整的認證邏輯",
                        "支援 token 管理和撤銷",
                        "更安全"
                    ],
                    "cons": [
                        "需要 TCRT 服務在線",
                        "額外的網路請求"
                    ]
                },
                {
                    "approach": "SSO / OAuth2",
                    "description": "實作標準的 SSO 或 OAuth2 協定",
                    "pros": [
                        "標準化",
                        "可擴展到其他服務",
                        "最佳實踐"
                    ],
                    "cons": [
                        "實作複雜",
                        "需要大量改動"
                    ]
                }
            ],
            "recommended_approach": {
                "name": "API 整合 + Token 共享",
                "steps": [
                    "1. User Story Map Tool 提供 TCRT 登入選項",
                    "2. 使用者輸入 TCRT 帳號密碼",
                    "3. 後端呼叫 TCRT API 進行登入驗證",
                    "4. 取得 TCRT JWT token",
                    "5. 在 User Story Map Tool 中建立對應的會話",
                    "6. 使用 TCRT token 或產生新的內部 token",
                    "7. 需要時使用 TCRT API 驗證 token 有效性"
                ]
            },
            "implementation_requirements": [
                "在 User Story Map Tool 後端新增 TCRT 認證服務",
                "實作 HTTP client 呼叫 TCRT API",
                "處理 token 的儲存和刷新",
                "實作使用者資訊同步機制",
                "新增 TCRT 登入的前端介面"
            ]
        }
        
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        
        return summary

def main():
    """主測試流程"""
    print("\n" + "=" * 60)
    print("  TCRT 認證整合概念驗證測試")
    print("=" * 60)
    print(f"\nTCRT 資料庫: {TCRT_DB_PATH}")
    print(f"TCRT API: {TCRT_API_BASE_URL}")
    print(f"測試時間: {datetime.now().isoformat()}")
    
    tester = TCRTAuthIntegrationTest()
    
    # 測試 1: 資料庫連接
    if not tester.test_1_database_connection():
        print("\n❌ 測試失敗: 無法連接 TCRT 資料庫")
        sys.exit(1)
    
    # 讓使用者選擇測試帳號
    print("\n請選擇測試帳號:")
    print("1. admin (密碼: 123)")
    print("2. testuser (密碼: 123)")
    print("3. 自訂")
    
    choice = input("\n選擇 (1-3): ").strip()
    
    if choice == "1":
        username, password = "admin", "123"
    elif choice == "2":
        username, password = "testuser", "123"
    else:
        username = input("Username: ").strip()
        password = input("Password: ").strip()
    
    # 測試 2: 登入
    if not tester.test_2_login_with_tcrt_user(username, password):
        print("\n❌ 測試失敗: 登入失敗")
        sys.exit(1)
    
    # 測試 3: 驗證 token
    if not tester.test_3_verify_token():
        print("\n❌ 測試失敗: Token 驗證失敗")
        sys.exit(1)
    
    # 測試 4: Token 驗證 endpoint
    if not tester.test_4_validate_token_endpoint():
        print("\n❌ 測試失敗: Token 驗證 endpoint 失敗")
        sys.exit(1)
    
    # 測試 5: 登出
    if not tester.test_5_logout():
        print("\n❌ 測試失敗: 登出失敗")
        sys.exit(1)
    
    # 測試 6: 整合建議
    tester.test_6_integration_summary()
    
    print("\n" + "=" * 60)
    print("  ✓ 所有測試通過!")
    print("=" * 60)
    print("\n概念驗證結論:")
    print("1. ✓ TCRT 認證 API 可正常存取")
    print("2. ✓ 登入流程完整可用")
    print("3. ✓ Token 驗證機制正常")
    print("4. ✓ Token 撤銷機制正常")
    print("5. ✓ 可以透過 API 整合方式使用 TCRT 使用者")
    print("\n建議採用 API 整合方式，在 User Story Map Tool 中")
    print("實作 TCRT 認證提供者，讓使用者可以使用 TCRT 帳號登入。")

if __name__ == "__main__":
    main()
