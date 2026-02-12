import feedparser
import time
import ssl
from . import config

# Bypass SSL verification for RSS feeds
if hasattr(ssl, '_create_unverified_context'):
    ssl._create_default_https_context = ssl._create_unverified_context

KEYWORDS = ["merge", "combine", "csv", "excel", "messy", "clean"]

def monitor_subreddit_rss(subreddit_name="excel"):
    """
    Scans a subreddit using RSS (No Login Required).
    """
    rss_url = f"https://www.reddit.com/r/{subreddit_name}/new/.rss"
    print(f"Scanning {rss_url} for keywords: {KEYWORDS}...")
    
    feed = feedparser.parse(rss_url)
    
    if feed.bozo:
        print(f"Error parsing RSS: {feed.bozo_exception}")
        return

    found_count = 0
    for entry in feed.entries:
        # Check title and content (summary)
        # Note: entry.summary usually contains HTML, so simple keyword check works but might match tags.
        text = (entry.title + " " + getattr(entry, 'summary', '')).lower()
        
        if any(kw in text for kw in KEYWORDS):
            found_count += 1
            print(f"\n[MATCH] {entry.title}")
            print(f"Link: {entry.link}")
            print(f"Date: {entry.published}")
            print("------------------------------------------------")
            
    print(f"Scan complete. Found {found_count} relevant posts.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--subreddit", default="excel")
    args = parser.parse_args()
    
    monitor_subreddit_rss(args.subreddit)
