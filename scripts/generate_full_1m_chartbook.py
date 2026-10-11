import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import mplfinance as mpf
from datetime import datetime
import os

db_path = '/home/vihaan/stark industries database/index-fractal/data/intraday_1m.db'
pdf_path = '/home/vihaan/stark industries database/index-fractal/public/banknifty_1m_full_chartbook.pdf'

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Get all unique trading days in the database
cur.execute('SELECT DISTINCT date FROM banknifty_1m')
all_dates = [r[0] for r in cur.fetchall()]

# Parse and filter between August 2025 and October 2026
target_dates = []
for d in all_dates:
    try:
        dt = datetime.strptime(d, '%d-%m-%Y')
        if datetime(2025, 8, 1) <= dt <= datetime(2026, 10, 11):
            target_dates.append((dt, d))
    except Exception:
        pass

target_dates.sort()
print(f"Total trading days to compile: {len(target_dates)}")

os.makedirs(os.path.dirname(pdf_path), exist_ok=True)

with PdfPages(pdf_path) as pdf:
    # 1. Title / Cover Page
    fig_cover = plt.figure(figsize=(11.69, 8.27), dpi=150)
    plt.axis('off')
    fig_cover.text(0.5, 0.65, 'BANK NIFTY INTRADAY 1-MINUTE CHARTBOOK', 
                   ha='center', va='center', fontsize=24, fontweight='heavy', color='#131722')
    fig_cover.text(0.5, 0.55, 'August 2025 – October 2026 (Full 375-Minute Sessions)', 
                   ha='center', va='center', fontsize=14, color='#475569')
    fig_cover.text(0.5, 0.45, f'Total Trading Sessions: {len(target_dates)} Days | High-Resolution Vector Print Edition', 
                   ha='center', va='center', fontsize=11, color='#64748b')
    fig_cover.text(0.5, 0.25, 'Stark Industries Quantitative Terminal · Prepared for Desk Reference', 
                   ha='center', va='center', fontsize=10, style='italic', color='#94a3b8')
    pdf.savefig(fig_cover)
    plt.close(fig_cover)

    # 2. Iterate each trading day and plot 1-minute candlestick session
    for idx, (dt, date_str) in enumerate(target_dates, 1):
        cur.execute('SELECT time, open, high, low, close FROM banknifty_1m WHERE date = ? ORDER BY time', (date_str,))
        rows = cur.fetchall()
        if len(rows) < 50:
            continue

        df_list = []
        for r in rows:
            candle_dt = datetime.strptime(f"{date_str} {r[0]}", '%d-%m-%Y %H:%M:%S')
            df_list.append({
                'Date': candle_dt,
                'Open': r[1],
                'High': r[2],
                'Low': r[3],
                'Close': r[4],
                'Volume': 1000
            })

        df = pd.DataFrame(df_list).set_index('Date')

        fig, ax = plt.subplots(figsize=(11.69, 8.27), dpi=150)

        # Plot 375 candles with clean white print theme
        mpf.plot(
            df,
            type='candle',
            ax=ax,
            style='yahoo',
            show_nontrading=False,
            datetime_format='%H:%M',
            xrotation=0
        )

        day_open = df['Open'].iloc[0]
        day_close = df['Close'].iloc[-1]
        day_high = df['High'].max()
        day_low = df['Low'].min()
        day_change = day_close - day_open
        day_pct = (day_change / day_open) * 100
        day_range = day_high - day_low

        day_name = dt.strftime('%A')
        formatted_date = dt.strftime('%d %B %Y')

        ax.set_title(
            f'BANK NIFTY (1-MIN) — {day_name}, {formatted_date} [Session #{idx}] | Open: {day_open:.1f} | High: {day_high:.1f} | Low: {day_low:.1f} | Close: {day_close:.1f} ({day_pct:+.2f}%) | Range: {day_range:.1f} pts',
            fontsize=10,
            fontweight='bold',
            pad=10
        )
        ax.grid(True, linestyle='--', alpha=0.4)

        plt.tight_layout()
        pdf.savefig(fig)
        plt.close(fig)

        if idx % 25 == 0 or idx == len(target_dates):
            print(f"Progress: Compiled {idx}/{len(target_dates)} days ({idx/len(target_dates)*100:.1f}%)")

conn.close()
print("Compilation complete! Master PDF ready.")
