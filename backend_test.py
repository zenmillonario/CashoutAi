
import requests
import sys
import json
from datetime import datetime

class CashOutAITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.issues_fixed = {
            "admin_credentials": False,
            "login_working": False,
            "mobile_chat_input": None,  # Will be tested with UI
            "profile_picture": None,    # Will be tested with UI
            "real_messages": False
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
            
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password):
        """Test login functionality"""
        success, response = self.run_test(
            f"Login with {username}",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        
        if success and response.get('success'):
            self.user = response.get('user')
            print(f"Logged in as: {self.user.get('username')} (Role: {self.user.get('role')})")
            self.issues_fixed["login_working"] = True
            return True
        return False

    def test_admin_login_visibility(self):
        """Test if admin credentials are visible in frontend code"""
        # This is a placeholder - actual check will be done in UI testing
        print("\n🔍 Checking admin credentials visibility...")
        print("✅ Admin credentials check will be performed during UI testing")
        return True

    def test_get_messages(self):
        """Test retrieving chat messages"""
        success, response = self.run_test(
            "Get chat messages",
            "GET",
            "chat/messages",
            200
        )
        
        if success:
            messages = response
            print(f"Retrieved {len(messages)} messages")
            
            # Check if messages are from real users (not bot messages)
            if len(messages) > 0:
                user_types = set([msg.get('role') for msg in messages])
                print(f"Message sender roles: {user_types}")
                
                # If we have messages and they're from users/admins (not bots)
                if 'bot' not in user_types:
                    self.issues_fixed["real_messages"] = True
            else:
                # No messages yet is fine too
                self.issues_fixed["real_messages"] = True
                
            return True
        return False

    def test_send_message(self, message_text):
        """Test sending a chat message"""
        if not self.user:
            print("❌ Cannot send message - not logged in")
            return False
            
        success, response = self.run_test(
            "Send chat message",
            "POST",
            f"chat/messages?user_id={self.user.get('id')}",
            200,
            data={"message": message_text}
        )
        
        if success:
            print(f"Message sent: {response.get('message')}")
            return True
        return False

    def test_update_profile(self, name=None, profile_picture=None):
        """Test updating user profile"""
        if not self.user:
            print("❌ Cannot update profile - not logged in")
            return False
            
        update_data = {}
        if name:
            update_data["name"] = name
        if profile_picture:
            update_data["profile_picture"] = profile_picture
            
        success, response = self.run_test(
            "Update user profile",
            "PUT",
            f"users/me/{self.user.get('id')}/profile",
            200,
            data=update_data
        )
        
        if success:
            print(f"Profile updated: {response}")
            return True
        return False

    def test_get_online_users(self):
        """Test getting online users count"""
        success, response = self.run_test(
            "Get online users",
            "GET",
            "chat/online-users",
            200
        )
        
        if success:
            print(f"Online users: {response.get('count')}")
            return True
        return False

    def summarize_results(self):
        """Print test results summary"""
        print("\n" + "="*50)
        print(f"📊 API Tests Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print("\n🔍 Issues Fixed Status:")
        
        for issue, status in self.issues_fixed.items():
            status_icon = "✅" if status else ("❓" if status is None else "❌")
            print(f"{status_icon} {issue.replace('_', ' ').title()}")
            
        print("="*50)
        
        return self.tests_passed == self.tests_run

def main():
    # Get backend URL from environment
    backend_url = "https://6c737c7f-4678-461d-8dfa-47774f9c2978.preview.emergentagent.com"
    
    print(f"Testing CashOutAI API at: {backend_url}")
    tester = CashOutAITester(backend_url)
    
    # Test regular user login
    test_user = f"test_user_{datetime.now().strftime('%H%M%S')}"
    test_password = "test123"
    if not tester.test_login(test_user, test_password):
        print("❌ Regular user login failed, stopping tests")
        return 1
        
    # Test admin login
    if not tester.test_login("admin", "admin123"):
        print("⚠️ Admin login failed, but continuing tests")
    
    # Test admin credentials visibility
    tester.test_admin_login_visibility()
    
    # Test getting messages
    if not tester.test_get_messages():
        print("❌ Getting messages failed")
    
    # Test sending a message
    test_message = f"Test message from API test at {datetime.now().strftime('%H:%M:%S')}"
    if not tester.test_send_message(test_message):
        print("❌ Sending message failed")
    
    # Test getting messages again to see our new message
    if not tester.test_get_messages():
        print("❌ Getting messages after sending failed")
    
    # Test updating profile
    new_name = f"Updated User {datetime.now().strftime('%H%M')}"
    test_profile_pic = "https://i.pravatar.cc/150?img=3"
    if not tester.test_update_profile(name=new_name, profile_picture=test_profile_pic):
        print("❌ Updating profile failed")
    
    # Test getting online users
    if not tester.test_get_online_users():
        print("❌ Getting online users failed")
    
    # Summarize results
    success = tester.summarize_results()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
