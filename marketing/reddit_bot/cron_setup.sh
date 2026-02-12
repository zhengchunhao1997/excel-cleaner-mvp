#!/bin/bash

# Absolute path to the project
PROJECT_DIR="/Users/Zhuanz/zch/skillCollection/excel-cleaner-mvp"
PYTHON_EXEC="python3"

# 1. Scan r/excel for keywords (Using RSS - No Login) - Every 2 hours
# 0 */2 * * * cd $PROJECT_DIR && $PYTHON_EXEC -m marketing.reddit_bot.monitor_rss --subreddit excel >> marketing/reddit_bot/logs/scan.log 2>&1

# 2. (Optional) Auto-Post using Browser Simulation (Requires valid User/Pass in .env) - Weekly
# 0 9 * * 1 cd $PROJECT_DIR && $PYTHON_EXEC -m marketing.reddit_bot.publisher_browser marketing/content_templates/weekly_update.md --subreddit test >> marketing/reddit_bot/logs/publish.log 2>&1

echo "Cron templates prepared (Browser/RSS Mode). Run 'crontab -e' to enable."
