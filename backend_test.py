#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class CampusStoreAPITester:
    def __init__(self, base_url: str = "https://collexchange.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.college_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_seed_colleges(self):
        """Test seeding colleges"""
        success, response = self.make_request('POST', 'seed', expected_status=200)
        self.log_test("Seed Colleges", success, 
                     f"Response: {response.get('message', 'No message')}" if success else f"Error: {response}")
        return success

    def test_get_colleges(self):
        """Test getting colleges list"""
        success, response = self.make_request('GET', 'colleges')
        if success and isinstance(response, list) and len(response) > 0:
            self.college_id = response[0]['id']  # Use first college for testing
            self.log_test("Get Colleges", True, f"Found {len(response)} colleges")
            return True
        else:
            self.log_test("Get Colleges", False, f"Error: {response}")
            return False

    def test_signup(self):
        """Test user signup"""
        if not self.college_id:
            self.log_test("Signup", False, "No college_id available")
            return False

        timestamp = datetime.now().strftime('%H%M%S')
        signup_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@test.edu",
            "password": "testpass123",
            "phone": "+1234567890",
            "college_id": self.college_id
        }

        success, response = self.make_request('POST', 'auth/signup', signup_data)
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log_test("User Signup", True, f"User created with ID: {self.user_id}")
            return True
        else:
            self.log_test("User Signup", False, f"Error: {response}")
            return False

    def test_login(self):
        """Test user login with existing credentials"""
        if not hasattr(self, '_signup_email'):
            # Use the signup credentials
            timestamp = datetime.now().strftime('%H%M%S')
            self._signup_email = f"test{timestamp}@test.edu"
            self._signup_password = "testpass123"

        login_data = {
            "email": self._signup_email,
            "password": self._signup_password
        }

        success, response = self.make_request('POST', 'auth/login', login_data)
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log_test("User Login", True, "Login successful")
            return True
        else:
            self.log_test("User Login", False, f"Error: {response}")
            return False

    def test_get_profile(self):
        """Test getting user profile"""
        if not self.token:
            self.log_test("Get Profile", False, "No auth token")
            return False

        success, response = self.make_request('GET', 'auth/me')
        if success and 'id' in response:
            self.log_test("Get Profile", True, f"Profile retrieved for user: {response['name']}")
            return True
        else:
            self.log_test("Get Profile", False, f"Error: {response}")
            return False

    def test_get_categories(self):
        """Test getting categories"""
        success, response = self.make_request('GET', 'categories')
        if success and isinstance(response, list):
            self.log_test("Get Categories", True, f"Found {len(response)} categories")
            return True
        else:
            self.log_test("Get Categories", False, f"Error: {response}")
            return False

    def test_create_item(self):
        """Test creating an item"""
        if not self.token:
            self.log_test("Create Item", False, "No auth token")
            return False

        item_data = {
            "title": "Test MacBook Pro",
            "description": "A test laptop for sale and rent",
            "category": "electronics",
            "mode": "both",
            "price_buy": 1200.00,
            "price_borrow": 50.00,
            "deposit": 200.00,
            "condition": "good",
            "images": ["https://images.unsplash.com/photo-1731983568664-9c1d8a87e7a2?w=400&q=80"]
        }

        success, response = self.make_request('POST', 'items', item_data, expected_status=200)
        if success and 'id' in response:
            self.item_id = response['id']
            self.log_test("Create Item", True, f"Item created with ID: {self.item_id}")
            return True
        else:
            self.log_test("Create Item", False, f"Error: {response}")
            return False

    def test_get_items(self):
        """Test getting items list"""
        if not self.token:
            self.log_test("Get Items", False, "No auth token")
            return False

        success, response = self.make_request('GET', 'items')
        if success and isinstance(response, list):
            self.log_test("Get Items", True, f"Found {len(response)} items")
            return True
        else:
            self.log_test("Get Items", False, f"Error: {response}")
            return False

    def test_get_item_detail(self):
        """Test getting item details"""
        if not self.token or not hasattr(self, 'item_id'):
            self.log_test("Get Item Detail", False, "No auth token or item_id")
            return False

        success, response = self.make_request('GET', f'items/{self.item_id}')
        if success and 'id' in response:
            self.log_test("Get Item Detail", True, f"Item details retrieved: {response['title']}")
            return True
        else:
            self.log_test("Get Item Detail", False, f"Error: {response}")
            return False

    def test_dashboard_stats(self):
        """Test getting dashboard stats"""
        if not self.token:
            self.log_test("Dashboard Stats", False, "No auth token")
            return False

        success, response = self.make_request('GET', 'stats/dashboard')
        if success and 'items_listed' in response:
            self.log_test("Dashboard Stats", True, f"Stats retrieved: {response['items_listed']} items listed")
            return True
        else:
            self.log_test("Dashboard Stats", False, f"Error: {response}")
            return False

    def test_create_order(self):
        """Test creating a buy order"""
        if not self.token or not hasattr(self, 'item_id'):
            self.log_test("Create Order", False, "No auth token or item_id")
            return False

        # First create another user to buy from
        timestamp = datetime.now().strftime('%H%M%S') + "2"
        buyer_data = {
            "name": f"Buyer User {timestamp}",
            "email": f"buyer{timestamp}@test.edu",
            "password": "testpass123",
            "college_id": self.college_id
        }

        # Create buyer account
        success, response = self.make_request('POST', 'auth/signup', buyer_data)
        if not success:
            self.log_test("Create Order", False, "Failed to create buyer account")
            return False

        buyer_token = response['token']
        original_token = self.token
        self.token = buyer_token

        # Try to create order
        order_data = {"item_id": self.item_id}
        success, response = self.make_request('POST', 'orders', order_data, expected_status=200)
        
        # Restore original token
        self.token = original_token

        if success and 'id' in response:
            self.order_id = response['id']
            self.log_test("Create Order", True, f"Order created with ID: {self.order_id}")
            return True
        else:
            self.log_test("Create Order", False, f"Error: {response}")
            return False

    def test_create_borrow_request(self):
        """Test creating a borrow request"""
        if not self.token or not hasattr(self, 'item_id'):
            self.log_test("Create Borrow Request", False, "No auth token or item_id")
            return False

        # Create another user to borrow from
        timestamp = datetime.now().strftime('%H%M%S') + "3"
        borrower_data = {
            "name": f"Borrower User {timestamp}",
            "email": f"borrower{timestamp}@test.edu",
            "password": "testpass123",
            "college_id": self.college_id
        }

        # Create borrower account
        success, response = self.make_request('POST', 'auth/signup', borrower_data)
        if not success:
            self.log_test("Create Borrow Request", False, "Failed to create borrower account")
            return False

        borrower_token = response['token']
        original_token = self.token
        self.token = borrower_token

        # Create borrow request
        start_date = (datetime.now() + timedelta(days=1)).isoformat()
        end_date = (datetime.now() + timedelta(days=3)).isoformat()
        
        borrow_data = {
            "item_id": self.item_id,
            "start_date": start_date,
            "end_date": end_date
        }

        success, response = self.make_request('POST', 'borrow', borrow_data, expected_status=200)
        
        # Restore original token
        self.token = original_token

        if success and 'id' in response:
            self.borrow_id = response['id']
            self.log_test("Create Borrow Request", True, f"Borrow request created with ID: {self.borrow_id}")
            return True
        else:
            self.log_test("Create Borrow Request", False, f"Error: {response}")
            return False

    def test_payment_checkout(self):
        """Test payment checkout creation"""
        if not self.token or not hasattr(self, 'order_id'):
            self.log_test("Payment Checkout", False, "No auth token or order_id")
            return False

        payment_data = {
            "order_id": self.order_id,
            "origin_url": "https://collexchange.preview.emergentagent.com"
        }

        success, response = self.make_request('POST', 'payments/checkout', payment_data)
        if success and 'checkout_url' in response:
            self.log_test("Payment Checkout", True, "Checkout session created successfully")
            return True
        else:
            self.log_test("Payment Checkout", False, f"Error: {response}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Campus Store API Tests...")
        print("=" * 50)

        # Core functionality tests
        self.test_seed_colleges()
        self.test_get_colleges()
        self.test_signup()
        self.test_get_profile()
        self.test_get_categories()
        
        # Item management tests
        self.test_create_item()
        self.test_get_items()
        self.test_get_item_detail()
        
        # Dashboard and stats
        self.test_dashboard_stats()
        
        # Transaction tests
        self.test_create_order()
        self.test_create_borrow_request()
        self.test_payment_checkout()

        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return 1

def main():
    tester = CampusStoreAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())