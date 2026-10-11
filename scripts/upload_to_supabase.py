import sqlite3
import requests
import json
import time

SUPABASE_URL = "https://vvpuzysbkjzrlxhoiivp.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2cHV6eXNia2p6cmx4aG9paXZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcwNjU1MywiZXhwIjoyMTA3MjgyNTUzfQ.bVPjiJJ19tPzlmjUE_IresbIBnJOPb246dlaq-UdS58"

DB_PATH = "/home/vihaan/stark industries database/index-fractal/data/intraday_1m.db"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def check_table_ready():
    url = f"{SUPABASE_URL}/rest/v1/banknifty_1m?select=id&limit=1"
    res = requests.get(url, headers=headers)
    return res.status_code == 200

def stream_upload(batch_size=2000, max_rows=150000):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # We prioritize the most recent 150,000 to 250,000 candles (covering the past 1-2 years of 1-minute bars)
    # to stay safely within Supabase's free tier quotas and optimize sub-second query latency
    print("Reading recent 1-minute sessions from local SQLite...")
    cur.execute("SELECT date, time, open, high, low, close FROM banknifty_1m ORDER BY rowid DESC LIMIT ?", (max_rows,))
    rows = cur.fetchall()
    conn.close()
    
    # Reverse so they are chronological
    rows.reverse()
    total = len(rows)
    print(f"Loaded {total} bars. Streaming to Supabase in batches of {batch_size}...")
    
    uploaded = 0
    endpoint = f"{SUPABASE_URL}/rest/v1/banknifty_1m"
    
    for i in range(0, total, batch_size):
        chunk = rows[i:i + batch_size]
        payload = [
            {
                "date": r[0],
                "time": r[1],
                "open": r[2],
                "high": r[3],
                "low": r[4],
                "close": r[5]
            }
            for r in chunk
        ]
        
        for attempt in range(3):
            try:
                res = requests.post(endpoint, headers=headers, json=payload, timeout=30)
                if res.status_code in (200, 201):
                    uploaded += len(chunk)
                    print(f"Uploaded {uploaded}/{total} bars ({(uploaded/total)*100:.1f}%)")
                    break
                else:
                    print(f"Batch {i} failed with status {res.status_code}: {res.text[:100]}. Retrying...")
                    time.sleep(2)
            except Exception as e:
                print(f"Network error on batch {i}: {e}. Retrying...")
                time.sleep(2)
    
    print(f"Finished! Successfully uploaded {uploaded} bars to Supabase.")

if __name__ == "__main__":
    if check_table_ready():
        print("Table banknifty_1m is ready. Starting upload...")
        stream_upload()
    else:
        print("Table banknifty_1m does not exist yet. Please run the SQL schema in Supabase SQL Editor.")
