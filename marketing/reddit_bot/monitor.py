import praw
import time
import os
from . import config

KEYWORDS = ["merge", "combine", "csv", "excel", "messy", "clean"]

def monitor_subreddit(subreddit_name="excel", limit=10):
    """
    Scans a subreddit for relevant posts to 'Solve'.
    """
    valid, msg = config.validate_config()
    if not valid:
        print(f"Error: {msg}")
        return

    reddit = praw.Reddit(
        client_id=config.REDDIT_CLIENT_ID,
        client_secret=config.REDDIT_CLIENT_SECRET,
        user_agent=config.REDDIT_USER_AGENT,
        username=config.REDDIT_USERNAME,
        password=config.REDDIT_PASSWORD
    )

    print(f"Scanning r/{subreddit_name} for keywords: {KEYWORDS}...")
    subreddit = reddit.subreddit(subreddit_name)
    
    for submission in subreddit.new(limit=limit):
        text = (submission.title + " " + submission.selftext).lower()
        if any(kw in text for kw in KEYWORDS):
            print(f"\n[MATCH] {submission.title}")
            print(f"Link: {submission.url}")
            print("------------------------------------------------")

def check_inbox_and_reply():
    """
    Checks inbox for unread replies and auto-replies (Simple Rule-based).
    """
    valid, msg = config.validate_config()
    if not valid: return

    reddit = praw.Reddit(
        client_id=config.REDDIT_CLIENT_ID,
        client_secret=config.REDDIT_CLIENT_SECRET,
        user_agent=config.REDDIT_USER_AGENT,
        username=config.REDDIT_USERNAME,
        password=config.REDDIT_PASSWORD
    )
    
    print("Checking inbox for new messages...")
    # Get unread messages
    unread = list(reddit.inbox.unread(limit=None))
    print(f"Found {len(unread)} unread messages.")
    
    for message in unread:
        print(f"New message from {message.author}: {message.body}")
        
        # Simple Auto-Reply Logic
        body_lower = message.body.lower()
        reply_text = None
        
        if "link" in body_lower or "url" in body_lower:
            reply_text = "Here is the link to the tool: [Your URL Here]. It runs 100% locally!"
        elif "price" in body_lower or "cost" in body_lower:
            reply_text = "It is completely free to use right now!"
        elif "safe" in body_lower or "security" in body_lower:
            reply_text = "Yes, it is safe. All processing happens in your browser, no data is uploaded to any server."
            
        if reply_text:
            print(f"-> Replying: {reply_text}")
            # Uncomment to enable actual replying
            # message.reply(reply_text)
            # message.mark_read()
        else:
            print("-> No auto-reply rule matched.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["scan", "inbox"], default="scan")
    args = parser.parse_args()
    
    if args.mode == "scan":
        monitor_subreddit()
    elif args.mode == "inbox":
        check_inbox_and_reply()
