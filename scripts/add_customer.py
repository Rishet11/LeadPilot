#!/usr/bin/env python3
"""
Customer Management CLI for LeadPilot

Usage:
    python scripts/add_customer.py --name "Acme Agency" --email "john@acme.com"
    python scripts/add_customer.py --name "Admin" --email "admin@leadpilot.com" --admin
    python scripts/add_customer.py --list
"""

import argparse
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import SessionLocal, Customer
from api.auth import generate_api_key


def add_customer(name: str, email: str, is_admin: bool = False) -> dict:
    """Create a new customer with a unique API key."""
    db = SessionLocal()
    try:
        # Check if email exists
        existing = db.query(Customer).filter(Customer.email == email).first()
        if existing:
            print(f"Error: Customer with email {email} already exists")
            return None
        
        api_key = generate_api_key()
        customer = Customer(
            name=name,
            email=email,
            api_key=api_key,
            is_admin=is_admin,
            is_active=True
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        
        return {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "api_key": api_key,
            "is_admin": customer.is_admin
        }
    finally:
        db.close()


def list_customers():
    """List all customers."""
    db = SessionLocal()
    try:
        customers = db.query(Customer).all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "api_key": c.api_key[:20] + "...",  # Partial key for security
                "is_active": c.is_active,
                "is_admin": c.is_admin,
            }
            for c in customers
        ]
    finally:
        db.close()


def deactivate_customer(email: str):
    """Deactivate a customer (soft delete)."""
    db = SessionLocal()
    try:
        customer = db.query(Customer).filter(Customer.email == email).first()
        if not customer:
            print(f"Error: Customer {email} not found")
            return False
        customer.is_active = False
        db.commit()
        return True
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="LeadPilot Customer Management")
    parser.add_argument("--name", help="Customer name")
    parser.add_argument("--email", help="Customer email")
    parser.add_argument("--admin", action="store_true", help="Make customer an admin")
    parser.add_argument("--list", action="store_true", help="List all customers")
    parser.add_argument("--deactivate", help="Deactivate customer by email")
    
    args = parser.parse_args()
    
    if args.list:
        customers = list_customers()
        if not customers:
            print("No customers found.")
        else:
            print(f"\n{'ID':<5} {'Name':<25} {'Email':<30} {'Admin':<6} {'API Key (partial)'}")
            print("-" * 90)
            for c in customers:
                admin_flag = "✓" if c["is_admin"] else ""
                active = "" if c["is_active"] else " (inactive)"
                print(f"{c['id']:<5} {c['name']:<25} {c['email']:<30} {admin_flag:<6} {c['api_key']}{active}")
        return
    
    if args.deactivate:
        if deactivate_customer(args.deactivate):
            print(f"✓ Customer {args.deactivate} deactivated")
        return
    
    if not args.name or not args.email:
        print("Error: --name and --email are required to add a customer")
        parser.print_help()
        return
    
    result = add_customer(args.name, args.email, args.admin)
    if result:
        print("\n" + "=" * 60)
        print("✓ CUSTOMER CREATED SUCCESSFULLY")
        print("=" * 60)
        print(f"Name:      {result['name']}")
        print(f"Email:     {result['email']}")
        print(f"Admin:     {'Yes' if result['is_admin'] else 'No'}")
        print("-" * 60)
        print(f"API KEY:   {result['api_key']}")
        print("-" * 60)
        print("\n⚠️  SAVE THIS API KEY - IT WILL NOT BE SHOWN AGAIN")
        print("Send this to your customer for API access.\n")


if __name__ == "__main__":
    main()
