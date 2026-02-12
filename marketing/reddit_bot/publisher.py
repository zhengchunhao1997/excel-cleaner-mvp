import praw
import os
import sys
import argparse
import re
from . import config

def parse_template(file_path):
    """
    Parses a markdown file to extract Title and Body.
    Expected format:
    **Title**: My Title Here
    
    **Body**:
    My body here...
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Template not found: {file_path}")
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Regex to find title
    title_match = re.search(r'\*\*Title\*\*:\s*(.+)', content)
    if not title_match:
        raise ValueError("Could not find '**Title**:' in template")
    
    title = title_match.group(1).strip()
    
    # Extract body (everything after **Body**:)
    body_match = re.search(r'\*\*Body\*\*:\s*(.+)', content, re.DOTALL)
    if not body_match:
        # Fallback: try to find where Body starts and take everything after
        if "**Body**" in content:
            parts = content.split("**Body**")
            if len(parts) > 1:
                body = parts[1].lstrip(": \n").strip()
            else:
                raise ValueError("Could not extract body")
        else:
            raise ValueError("Could not find '**Body**:' in template")
    else:
        body = body_match.group(1).strip()
        
    return title, body

def publish_post(template_path, subreddit_name="test", dry_run=False):
    # 1. Validate Config
    valid, msg = config.validate_config()
    if not valid and not dry_run:
        print(f"Error: {msg}")
        print("Please create a .env file with your Reddit API credentials.")
        return

    # 2. Parse Content
    try:
        title, body = parse_template(template_path)
    except Exception as e:
        print(f"Error parsing template: {e}")
        return

    print(f"--- Preparing to Post to r/{subreddit_name} ---")
    print(f"Title: {title}")
    print(f"Body Preview: {body[:100]}...")
    print("------------------------------------------")

    if dry_run:
        print("[DRY RUN] Post would be submitted now.")
        return

    # 3. Connect to Reddit
    try:
        reddit = praw.Reddit(
            client_id=config.REDDIT_CLIENT_ID,
            client_secret=config.REDDIT_CLIENT_SECRET,
            user_agent=config.REDDIT_USER_AGENT,
            username=config.REDDIT_USERNAME,
            password=config.REDDIT_PASSWORD
        )
        
        # Verify auth
        print(f"Authenticated as: {reddit.user.me()}")
        
        # 4. Submit
        subreddit = reddit.subreddit(subreddit_name)
        submission = subreddit.submit(title, selftext=body)
        print(f"SUCCESS! Post submitted: {submission.url}")
        
    except Exception as e:
        print(f"FAILED to submit post: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Publish a Reddit post from a template.")
    parser.add_argument("template", help="Path to the markdown template file")
    parser.add_argument("--subreddit", "-s", default="test", help="Subreddit to post to (default: test)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without posting")
    
    args = parser.parse_args()
    
    publish_post(args.template, args.subreddit, args.dry_run)
