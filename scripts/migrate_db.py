import sqlite3
import os

DB_PATH = "data/leadpilot.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Nothing to migrate.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    customer_columns = [
        ("lemon_squeezy_customer_id", "VARCHAR(100)"),
        ("subscription_id", "VARCHAR(100)"),
        ("variant_id", "VARCHAR(100)"),
        ("subscription_status", "VARCHAR(50) DEFAULT 'free'"),
        ("renews_at", "DATETIME"),
        ("plan_tier", "VARCHAR(50) DEFAULT 'free'"),
    ]

    print("Migrating database...")
    
    for col_name, col_type in customer_columns:
        try:
            cursor.execute(f"ALTER TABLE customers ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists. Skipping.")
            else:
                print(f"Error adding {col_name}: {e}")

    # Settings tenant-isolation support
    try:
        cursor.execute("ALTER TABLE settings ADD COLUMN customer_id INTEGER")
        print("Added column: settings.customer_id")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column settings.customer_id already exists. Skipping.")
        else:
            print(f"Error adding settings.customer_id: {e}")

    # Rebuild settings table to remove old global unique constraint on key
    cursor.execute("PRAGMA index_list(settings)")
    indexes = cursor.fetchall()
    has_global_unique_key = False
    for idx in indexes:
        # PRAGMA index_list columns: seq, name, unique, origin, partial
        idx_name = idx[1]
        is_unique = idx[2]
        if is_unique:
            cursor.execute(f"PRAGMA index_info({idx_name})")
            cols = [row[2] for row in cursor.fetchall()]
            if cols == ["key"]:
                has_global_unique_key = True
                break

    if has_global_unique_key:
        print("Detected legacy unique constraint on settings.key, rebuilding settings table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings_new (
                id INTEGER PRIMARY KEY,
                customer_id INTEGER,
                key VARCHAR(100) NOT NULL,
                value TEXT,
                updated_at DATETIME,
                FOREIGN KEY(customer_id) REFERENCES customers(id)
            )
        """)
        cursor.execute("""
            INSERT INTO settings_new (id, customer_id, key, value, updated_at)
            SELECT id, customer_id, key, value, updated_at FROM settings
        """)
        cursor.execute("DROP TABLE settings")
        cursor.execute("ALTER TABLE settings_new RENAME TO settings")
        print("Rebuilt settings table successfully.")

    # Usage table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usage_monthly (
            id INTEGER PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            period_start DATE NOT NULL,
            leads_generated INTEGER DEFAULT 0,
            scrape_jobs INTEGER DEFAULT 0,
            updated_at DATETIME,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    """)
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_usage_customer_period "
        "ON usage_monthly(customer_id, period_start)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS ix_usage_customer_id ON usage_monthly(customer_id)"
    )
    print("Ensured table: usage_monthly")

    # Webhook events audit/idempotency table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS webhook_events (
            id INTEGER PRIMARY KEY,
            source VARCHAR(50) NOT NULL,
            event_id VARCHAR(255) NOT NULL,
            event_name VARCHAR(100) NOT NULL,
            status VARCHAR(50) DEFAULT 'received',
            attempts INTEGER DEFAULT 1,
            payload TEXT NOT NULL,
            error_message TEXT,
            received_at DATETIME,
            processed_at DATETIME
        )
    """)
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_source_event "
        "ON webhook_events(source, event_id)"
    )
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS ix_webhook_source_event "
        "ON webhook_events(source, event_id)"
    )
    print("Ensured table: webhook_events")

    # Settings indexes
    cursor.execute(
        "CREATE INDEX IF NOT EXISTS ix_settings_customer_id ON settings(customer_id)"
    )
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_customer_key "
        "ON settings(customer_id, key)"
    )
    print("Ensured index: ix_settings_customer_id")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
