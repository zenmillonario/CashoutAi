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

def main():
    # Get the backend URL from the frontend .env file
    backend_url = "https://5440b074-8074-4941-8acd-0ee2d4c4bbdb.preview.emergentagent.com"
    
    # Create tester instance
    tester = CashOutAiTester(backend_url)
    
    print("\n===== TESTING CASHOUTAI TRADING TEAM CHAT APP =====\n")
    
    # Test 1: Login as admin
    print("\n----- Test 1: Admin Login -----")
    admin = tester.login_user("admin", "anything")
    if not admin or not admin.get('is_admin', False):
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Test 2: Register new users
    print("\n----- Test 2: User Registration -----")
    timestamp = int(time.time())
    user1 = tester.register_user(f"user1_{timestamp}", f"user1_{timestamp}@example.com", "password123")
    user2 = tester.register_user(f"user2_{timestamp}", f"user2_{timestamp}@example.com", "password123")
    
    if not user1 or not user2:
        print("❌ User registration failed, stopping tests")
        return 1
    
    # Test 3: Get pending users
    print("\n----- Test 3: Get Pending Users -----")
    pending_users = tester.get_pending_users()
    
    # Test 4: Approve users
    print("\n----- Test 4: Approve Users -----")
    if pending_users:
        for user in pending_users:
            if user['username'] == user1['username'] or user['username'] == user2['username']:
                tester.approve_user(user['id'], True)
    
    # Test 5: Login approved users
    print("\n----- Test 5: Login Approved Users -----")
    user1_login = tester.login_user(user1['username'], "password123")
    user2_login = tester.login_user(user2['username'], "password123")
    
    if not user1_login or not user2_login:
        print("❌ User login failed, stopping tests")
        return 1
    
    # Test 6: Send messages with stock tickers
    print("\n----- Test 6: Send Messages with Stock Tickers -----")
    tester.send_message(admin['id'], "Welcome to the team! Let's discuss $TSLA and $AAPL today.")
    tester.send_message(user1_login['id'], "I think $TSLA is going to break out soon!")
    tester.send_message(user2_login['id'], "I'm more bullish on $AAPL than $TSLA right now.")
    
    # Test 7: Get messages
    print("\n----- Test 7: Get Messages -----")
    messages = tester.get_messages()
    
    # Verify stock ticker highlighting
    ticker_messages = [msg for msg in messages if msg.get('highlighted_tickers')]
    if ticker_messages:
        print(f"✅ Found {len(ticker_messages)} messages with highlighted tickers")
        for msg in ticker_messages:
            print(f"  - Message: '{msg['content']}' has tickers: {msg['highlighted_tickers']}")
    else:
        print("❌ No messages with highlighted tickers found")
    
    # Test 8: Create paper trades
    print("\n----- Test 8: Create Paper Trades -----")
    tester.create_paper_trade(user1_login['id'], "TSLA", "BUY", 10, 250.50, "Initial position")
    tester.create_paper_trade(user1_login['id'], "AAPL", "BUY", 20, 180.75, "Apple looks good")
    tester.create_paper_trade(user1_login['id'], "TSLA", "SELL", 5, 275.25, "Taking partial profits")
    
    # Test 9: Get user trades
    print("\n----- Test 9: Get User Trades -----")
    user1_trades = tester.get_user_trades(user1_login['id'])
    
    # Test 10: Get user performance
    print("\n----- Test 10: Get User Performance -----")
    user1_performance = tester.get_user_performance(user1_login['id'])
    
    if user1_performance:
        print(f"Total Profit: ${user1_performance.get('total_profit', 0)}")
        print(f"Win Percentage: {user1_performance.get('win_percentage', 0)}%")
        print(f"Trades Count: {user1_performance.get('trades_count', 0)}")
        print(f"Average Gain: ${user1_performance.get('average_gain', 0)}")
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
