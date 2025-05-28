import requests
import sys
import time
import uuid
from datetime import datetime

class CashOutAiTester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.users = {}
        self.admin_user = None
        self.messages = []
        self.trades = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.text:
                    try:
                        return success, response.json()
                    except:
                        return success, response.text
                return success, None
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                return False, None

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, None

    def register_user(self, username, email, password):
        """Register a new user"""
        success, response = self.run_test(
            f"Register user {username}",
            "POST",
            "users/register",
            200,
            data={"username": username, "email": email, "password": password}
        )
        
        if success and response:
            self.users[username] = response
            print(f"User {username} registered with ID: {response['id']}")
            return response
        return None

    def login_user(self, username, password):
        """Login a user"""
        success, response = self.run_test(
            f"Login user {username}",
            "POST",
            "users/login",
            200,
            data={"username": username, "password": password}
        )
        
        if success and response:
            self.users[username] = response
            print(f"User {username} logged in with ID: {response['id']}")
            if response.get('is_admin', False):
                self.admin_user = response
            return response
        return None

    def get_pending_users(self):
        """Get pending users (admin only)"""
        success, response = self.run_test(
            "Get pending users",
            "GET",
            "users/pending",
            200
        )
        
        if success and response:
            print(f"Found {len(response)} pending users")
            return response
        return []

    def approve_user(self, user_id, approved=True):
        """Approve or reject a user (admin only)"""
        if not self.admin_user:
            print("❌ No admin user logged in")
            return False
            
        success, response = self.run_test(
            f"{'Approve' if approved else 'Reject'} user {user_id}",
            "POST",
            "users/approve",
            200,
            data={
                "user_id": user_id,
                "approved": approved,
                "admin_id": self.admin_user['id']
            }
        )
        
        return success

    def send_message(self, user_id, content):
        """Send a message"""
        success, response = self.run_test(
            "Send message",
            "POST",
            "messages",
            200,
            data={"user_id": user_id, "content": content}
        )
        
        if success and response:
            self.messages.append(response)
            print(f"Message sent: {content}")
            return response
        return None

    def get_messages(self, limit=50):
        """Get messages"""
        success, response = self.run_test(
            "Get messages",
            "GET",
            "messages",
            200,
            params={"limit": limit}
        )
        
        if success and response:
            self.messages = response
            print(f"Retrieved {len(response)} messages")
            return response
        return []

    def create_paper_trade(self, user_id, symbol, action, quantity, price, notes=None):
        """Create a paper trade"""
        success, response = self.run_test(
            f"Create {action} trade for {symbol}",
            "POST",
            "trades",
            200,
            data={
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "price": price,
                "notes": notes
            },
            params={"user_id": user_id}
        )
        
        if success and response:
            self.trades.append(response)
            print(f"Trade created: {action} {quantity} {symbol} at ${price}")
            return response
        return None

    def get_user_trades(self, user_id):
        """Get user trades"""
        success, response = self.run_test(
            "Get user trades",
            "GET",
            f"trades/{user_id}",
            200
        )
        
        if success and response:
            print(f"Retrieved {len(response)} trades for user")
            return response
        return []

    def get_user_performance(self, user_id):
        """Get user performance metrics"""
        success, response = self.run_test(
            "Get user performance",
            "GET",
            f"users/{user_id}/performance",
            200
        )
        
        if success and response:
            print(f"User performance: {response}")
            return response
        return None
        
    def update_avatar(self, user_id, avatar_url):
        """Update user avatar URL"""
        success, response = self.run_test(
            "Update avatar URL",
            "POST",
            f"users/{user_id}/avatar",
            200,
            params={"avatar_url": avatar_url}
        )
        
        if success:
            print(f"Avatar updated successfully for user {user_id}")
            return True
        return False
        
    def update_profile(self, user_id, username, email, avatar_url=None):
        """Update user profile"""
        data = {
            "username": username,
            "email": email
        }
        
        if avatar_url:
            data["avatar_url"] = avatar_url
            
        success, response = self.run_test(
            "Update user profile",
            "PUT",
            f"users/{user_id}/profile",
            200,
            data=data
        )
        
        if success and response:
            print(f"Profile updated successfully for user {user_id}")
            return response
        return None

def test_profile_picture_functionality():
    # Get the backend URL from the frontend .env file
    backend_url = "https://5440b074-8074-4941-8acd-0ee2d4c4bbdb.preview.emergentagent.com"
    
    # Create tester instance
    tester = CashOutAiTester(backend_url)
    
    print("\n===== TESTING PROFILE PICTURE FUNCTIONALITY =====\n")
    
    # Test 1: Login as admin
    print("\n----- Test 1: Admin Login -----")
    admin = tester.login_user("admin", "anything")
    if not admin or not admin.get('is_admin', False):
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Test 2: Register a new user
    print("\n----- Test 2: User Registration -----")
    timestamp = int(time.time())
    test_user = tester.register_user(f"testuser_{timestamp}", f"testuser_{timestamp}@example.com", "password123")
    
    if not test_user:
        print("❌ User registration failed, stopping tests")
        return 1
    
    # Test 3: Approve the user
    print("\n----- Test 3: Approve User -----")
    pending_users = tester.get_pending_users()
    
    if pending_users:
        for user in pending_users:
            if user['username'] == test_user['username']:
                tester.approve_user(user['id'], True)
    
    # Test 4: Login as the approved user
    print("\n----- Test 4: Login Approved User -----")
    user_login = tester.login_user(test_user['username'], "password123")
    
    if not user_login:
        print("❌ User login failed, stopping tests")
        return 1
    
    # Test 5: Update avatar URL
    print("\n----- Test 5: Update Avatar URL -----")
    test_avatar_url = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    avatar_updated = tester.update_avatar(user_login['id'], test_avatar_url)
    
    if not avatar_updated:
        print("❌ Avatar update failed")
    
    # Test 6: Update profile with avatar URL
    print("\n----- Test 6: Update Profile -----")
    updated_profile = tester.update_profile(
        user_login['id'],
        f"updated_{test_user['username']}",
        user_login['email'],
        test_avatar_url
    )
    
    if not updated_profile:
        print("❌ Profile update failed - This endpoint might not be implemented in the backend")
    
    # Test 7: Send a message to check if avatar appears
    print("\n----- Test 7: Send Message with Avatar -----")
    message = tester.send_message(user_login['id'], "Testing message with avatar")
    
    if message:
        print(f"Message sent with avatar_url: {message.get('avatar_url', 'None')}")
        if message.get('avatar_url') == test_avatar_url:
            print("✅ Avatar URL is correctly included in the message")
        else:
            print("❌ Avatar URL is not correctly included in the message")
    
    # Test 8: Get messages to verify avatar in messages
    print("\n----- Test 8: Verify Avatar in Messages -----")
    messages = tester.get_messages()
    
    user_messages = [msg for msg in messages if msg.get('user_id') == user_login['id']]
    if user_messages:
        for msg in user_messages:
            if msg.get('avatar_url') == test_avatar_url:
                print(f"✅ Message has correct avatar URL: {msg.get('avatar_url')}")
            else:
                print(f"❌ Message has incorrect avatar URL: {msg.get('avatar_url', 'None')}")
    
    # Test 9: Test removing avatar URL
    print("\n----- Test 9: Remove Avatar URL -----")
    avatar_removed = tester.update_avatar(user_login['id'], "")
    
    if not avatar_removed:
        print("❌ Avatar removal failed")
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

def main():
    return test_profile_picture_functionality()

if __name__ == "__main__":
    sys.exit(main())
