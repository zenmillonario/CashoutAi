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
        self.positions = []

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

    def get_user_positions(self, user_id):
        """Get user positions"""
        success, response = self.run_test(
            "Get user positions",
            "GET",
            f"positions/{user_id}",
            200
        )
        
        if success and response:
            self.positions = response
            print(f"Retrieved {len(response)} positions for user")
            return response
        return []

    def close_position(self, position_id, user_id, close_price=None):
        """Close a position"""
        params = {"user_id": user_id}
        if close_price is not None:
            params["close_price"] = close_price
            
        success, response = self.run_test(
            f"Close position {position_id}",
            "POST",
            f"positions/{position_id}/close",
            200,
            params=params
        )
        
        if success and response:
            print(f"Position closed with P&L: ${response.get('realized_pnl', 'N/A')}")
            return response
        return None

    def get_stock_price(self, symbol):
        """Get current stock price"""
        success, response = self.run_test(
            f"Get stock price for {symbol}",
            "GET",
            f"stock-price/{symbol}",
            200
        )
        
        if success and response:
            print(f"Current price for {symbol}: ${response.get('price', 'N/A')}")
            return response
        return None

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

def test_position_tracking():
    # Get the backend URL from the frontend .env file
    backend_url = "https://5440b074-8074-4941-8acd-0ee2d4c4bbdb.preview.emergentagent.com"
    
    # Create tester instance
    tester = CashOutAiTester(backend_url)
    
    print("\n===== TESTING POSITION TRACKING FUNCTIONALITY =====\n")
    
    # Test 1: Login as admin
    print("\n----- Test 1: Admin Login -----")
    admin = tester.login_user("admin", "anything")
    if not admin or not admin.get('is_admin', False):
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Test 2: Register a new user
    print("\n----- Test 2: User Registration -----")
    timestamp = int(time.time())
    test_user = tester.register_user(f"trader_{timestamp}", f"trader_{timestamp}@example.com", "password123")
    
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
    
    # Test 5: Create BUY trade for TSLA
    print("\n----- Test 5: Create BUY Trade for TSLA -----")
    tsla_buy = tester.create_paper_trade(
        user_login['id'],
        "TSLA",
        "BUY",
        100,
        250.00,
        "Initial TSLA position"
    )
    
    if not tsla_buy:
        print("❌ TSLA BUY trade failed, stopping tests")
        return 1
    
    # Test 6: Get user positions to verify position creation
    print("\n----- Test 6: Verify Position Creation -----")
    positions = tester.get_user_positions(user_login['id'])
    
    if not positions:
        print("❌ No positions found after BUY trade")
        return 1
    
    tsla_position = next((pos for pos in positions if pos['symbol'] == 'TSLA'), None)
    if not tsla_position:
        print("❌ TSLA position not found")
        return 1
    
    print(f"TSLA position created: {tsla_position['quantity']} shares @ ${tsla_position['avg_price']}")
    print(f"Current P&L: ${tsla_position.get('unrealized_pnl', 'N/A')}")
    
    # Test 7: Create another BUY trade for TSLA to test position aggregation
    print("\n----- Test 7: Add to TSLA Position -----")
    tsla_buy2 = tester.create_paper_trade(
        user_login['id'],
        "TSLA",
        "BUY",
        50,
        260.00,
        "Adding to TSLA position"
    )
    
    if not tsla_buy2:
        print("❌ Second TSLA BUY trade failed")
        return 1
    
    # Test 8: Verify position aggregation
    print("\n----- Test 8: Verify Position Aggregation -----")
    positions = tester.get_user_positions(user_login['id'])
    
    tsla_position = next((pos for pos in positions if pos['symbol'] == 'TSLA'), None)
    if not tsla_position:
        print("❌ TSLA position not found after second BUY")
        return 1
    
    expected_quantity = 150  # 100 + 50
    if tsla_position['quantity'] == expected_quantity:
        print(f"✅ Position quantity correctly updated to {tsla_position['quantity']}")
    else:
        print(f"❌ Position quantity incorrect. Expected {expected_quantity}, got {tsla_position['quantity']}")
    
    # Calculate expected average price: ((100 * 250) + (50 * 260)) / 150 = 253.33
    expected_avg_price = ((100 * 250.00) + (50 * 260.00)) / 150
    print(f"Expected avg price: ${expected_avg_price:.2f}, Actual: ${tsla_position['avg_price']}")
    
    # Test 9: Create BUY trade for AAPL to test multiple positions
    print("\n----- Test 9: Create AAPL Position -----")
    aapl_buy = tester.create_paper_trade(
        user_login['id'],
        "AAPL",
        "BUY",
        200,
        185.00,
        "Initial AAPL position"
    )
    
    if not aapl_buy:
        print("❌ AAPL BUY trade failed")
        return 1
    
    # Test 10: Verify multiple positions
    print("\n----- Test 10: Verify Multiple Positions -----")
    positions = tester.get_user_positions(user_login['id'])
    
    if len(positions) < 2:
        print(f"❌ Expected at least 2 positions, got {len(positions)}")
        return 1
    
    print(f"✅ User has {len(positions)} positions")
    
    # Test 11: Create SELL trade for partial TSLA position
    print("\n----- Test 11: Partial Position Close -----")
    tsla_sell = tester.create_paper_trade(
        user_login['id'],
        "TSLA",
        "SELL",
        50,
        270.00,
        "Selling part of TSLA position"
    )
    
    if not tsla_sell:
        print("❌ TSLA SELL trade failed")
        return 1
    
    # Test 12: Verify partial position close
    print("\n----- Test 12: Verify Partial Position Close -----")
    positions = tester.get_user_positions(user_login['id'])
    
    tsla_position = next((pos for pos in positions if pos['symbol'] == 'TSLA'), None)
    if not tsla_position:
        print("❌ TSLA position not found after partial SELL")
        return 1
    
    expected_quantity = 100  # 150 - 50
    if tsla_position['quantity'] == expected_quantity:
        print(f"✅ Position quantity correctly updated to {tsla_position['quantity']} after partial sell")
    else:
        print(f"❌ Position quantity incorrect after partial sell. Expected {expected_quantity}, got {tsla_position['quantity']}")
    
    # Test 13: Close position using close endpoint
    print("\n----- Test 13: Close Position via API -----")
    close_result = tester.close_position(tsla_position['id'], user_login['id'])
    
    if not close_result:
        print("❌ Position close failed")
        return 1
    
    # Test 14: Verify position is closed
    print("\n----- Test 14: Verify Position Closed -----")
    positions = tester.get_user_positions(user_login['id'])
    
    tsla_position = next((pos for pos in positions if pos['symbol'] == 'TSLA'), None)
    if tsla_position:
        print(f"❌ TSLA position still found after close: {tsla_position}")
    else:
        print("✅ TSLA position successfully closed")
    
    # Test 15: Check user performance after trades
    print("\n----- Test 15: Check User Performance -----")
    performance = tester.get_user_performance(user_login['id'])
    
    if not performance:
        print("❌ Failed to get user performance")
        return 1
    
    print(f"Total profit: ${performance.get('total_profit', 'N/A')}")
    print(f"Win percentage: {performance.get('win_percentage', 'N/A')}%")
    print(f"Trades count: {performance.get('trades_count', 'N/A')}")
    print(f"Average gain: ${performance.get('average_gain', 'N/A')}")
    
    # Test 16: Get stock price
    print("\n----- Test 16: Get Stock Price -----")
    tsla_price = tester.get_stock_price("TSLA")
    aapl_price = tester.get_stock_price("AAPL")
    
    if not tsla_price or not aapl_price:
        print("❌ Failed to get stock prices")
        return 1
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

def main():
    return test_position_tracking()

if __name__ == "__main__":
    sys.exit(main())
