import pyarrow.parquet as pq
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
import mplfinance as mpf
from datetime import datetime
import os

parquet_path = '/home/vihaan/stark industries database/index-fractal/data/BANKNIFTY_HF.parquet'
output_pdf_path = '/home/vihaan/stark industries database/BANKNIFTY_1Min_Level_Chartbook.pdf'

print("Loading HuggingFace 1-minute Parquet archive...")
table = pq.read_table(parquet_path)
df_all = table.select(['timestamp', 'open', 'high', 'low', 'close', 'trading_day']).to_pandas()

# Filter from August 2025 onwards
all_days = sorted(df_all['trading_day'].unique())
target_days = [d for d in all_days if d >= '2025-08-01']
total_days = len(target_days)
print(f"Total target trading sessions to compile: {total_days} days (from {target_days[0]} to {target_days[-1]})")

# Custom clean white trading style with crisp green & red
mc = mpf.make_marketcolors(
    up='#089981',
    down='#f23645',
    edge='inherit',
    wick='inherit',
    ohlc='inherit'
)
style = mpf.make_mpf_style(
    marketcolors=mc,
    gridcolor='#e2e8f0',
    gridstyle='--',
    y_on_right=True,
    facecolor='#ffffff',
    edgecolor='#cbd5e1'
)

with PdfPages(output_pdf_path) as pdf:
    # 1. Professional Cover Page
    fig_cover = plt.figure(figsize=(11.69, 8.27), dpi=150)
    plt.axis('off')
    fig_cover.text(0.5, 0.68, 'BANK NIFTY INTRADAY 1-MINUTE LEVEL CHARTBOOK', 
                   ha='center', va='center', fontsize=22, fontweight='bold', color='#0f172a')
    fig_cover.text(0.5, 0.58, f'August 2025 – {target_days[-1][:7]} ({total_days} Full Trading Sessions)', 
                   ha='center', va='center', fontsize=14, color='#334155')
    fig_cover.text(0.5, 0.48, 'Includes: 09:15 Opening Price • Session High & Low • 15m ORB Range • Session VWAP', 
                   ha='center', va='center', fontsize=11, color='#64748b')
    fig_cover.text(0.5, 0.38, 'Source: HuggingFace Quantitative Archive · Clean White Print Edition', 
                   ha='center', va='center', fontsize=10, color='#94a3b8')
    fig_cover.text(0.5, 0.18, 'Stark Industries Quantitative Desk · Physical Reference Volume', 
                   ha='center', va='center', fontsize=9, style='italic', color='#94a3b8')
    pdf.savefig(fig_cover)
    plt.close(fig_cover)

    # 2. Iterate each trading session
    for idx, day in enumerate(target_days, 1):
        df_day = df_all[df_all['trading_day'] == day].copy()
        if len(df_day) < 50:
            continue

        df_day['Date'] = pd.to_datetime(df_day['timestamp'])
        df_day = df_day.set_index('Date').sort_index()

        # Key levels
        day_open = df_day['open'].iloc[0]
        day_close = df_day['close'].iloc[-1]
        day_high = df_day['high'].max()
        day_low = df_day['low'].min()
        day_range = day_high - day_low
        day_pct = ((day_close - day_open) / day_open) * 100

        # 15-Minute Opening Range (ORB)
        orb_slice = df_day.iloc[:15]
        orb_high = orb_slice['high'].max()
        orb_low = orb_slice['low'].min()

        # Cumulative VWAP
        typical_price = (df_day['high'] + df_day['low'] + df_day['close']) / 3
        df_day['vwap'] = typical_price.expanding().mean()

        fig, ax = plt.subplots(figsize=(11.69, 8.27), dpi=150)

        df_mpf = df_day[['open', 'high', 'low', 'close']].rename(
            columns={'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close'}
        )

        hlines = dict(
            hlines=[day_high, day_open, day_low, orb_high, orb_low],
            colors=['#089981', '#64748b', '#f23645', '#0284c7', '#9333ea'],
            linestyle=['--', ':', '--', '-.', '-.'],
            linewidths=[1.1, 1.0, 1.1, 0.9, 0.9],
            alpha=0.85
        )

        ap = mpf.make_addplot(df_day['vwap'], ax=ax, color='#f59e0b', width=1.3)

        mpf.plot(
            df_mpf,
            type='candle',
            ax=ax,
            addplot=ap,
            hlines=hlines,
            style=style,
            show_nontrading=False,
            datetime_format='%H:%M',
            xrotation=0
        )

        # Clear text badges for the key levels
        ax.text(0, day_high, f' Day High: {day_high:.1f}', color='#089981', fontsize=7.5, fontweight='bold', va='bottom')
        ax.text(0, day_open, f' Day Open: {day_open:.1f}', color='#475569', fontsize=7.5, fontweight='bold', va='bottom')
        ax.text(0, day_low, f' Day Low: {day_low:.1f}', color='#f23645', fontsize=7.5, fontweight='bold', va='top')
        ax.text(len(df_mpf)-45, orb_high, f' 15m ORB High: {orb_high:.1f}', color='#0284c7', fontsize=7.5, va='bottom')
        ax.text(len(df_mpf)-45, orb_low, f' 15m ORB Low: {orb_low:.1f}', color='#9333ea', fontsize=7.5, va='top')

        dt_obj = datetime.strptime(day, '%Y-%m-%d')
        day_name = dt_obj.strftime('%A')
        formatted_date = dt_obj.strftime('%d %B %Y')

        ax.set_title(
            f'BANK NIFTY (1-MIN) — {day_name}, {formatted_date} [Session #{idx}/{total_days}]\n'
            f'Open: {day_open:.1f} | High: {day_high:.1f} | Low: {day_low:.1f} | Close: {day_close:.1f} ({day_pct:+.2f}%) | Day Range: {day_range:.1f} pts | 15m ORB: [{orb_low:.1f} - {orb_high:.1f}] | VWAP: {df_day["vwap"].iloc[-1]:.1f}',
            fontsize=9.5,
            fontweight='bold',
            pad=10,
            color='#0f172a'
        )

        plt.tight_layout()
        pdf.savefig(fig)
        plt.close(fig)

        if idx % 25 == 0 or idx == total_days:
            print(f"Compiled {idx}/{total_days} sessions ({(idx/total_days)*100:.1f}%)")

print(f"Master Level Chartbook successfully created at: {output_pdf_path}")
