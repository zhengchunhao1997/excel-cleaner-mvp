import asyncio
from playwright.async_api import async_playwright
from playwright_stealth.stealth import Stealth
import os
import argparse
import re
from . import config

# Reddit Selectors (New Reddit)
LOGIN_URL = "https://www.reddit.com/login"
SUBMIT_URL_TEMPLATE = "https://www.reddit.com/r/{}/submit"

async def login(page, username, password):
    print(f"Logging in to Reddit as {username}...")
    await page.goto(LOGIN_URL)
    await page.wait_for_load_state('networkidle')
    
    try:
        # Check for New Reddit Login (username input)
        # New Reddit often uses 'input[name="username"]' or 'input#login-username'
        new_login_selector = "input[name='username']"
        old_login_selector = "input[name='user']"
        
        if await page.locator(new_login_selector).is_visible(timeout=5000):
            print("Detected New Reddit Login Page")
            await page.fill(new_login_selector, username)
            await page.fill("input[name='password']", password)
            # Try to find the submit button - often "Log In" text or type='submit'
            # Note: New Reddit might require hitting Enter or specific button
            await page.keyboard.press("Enter")
            # Fallback to clicking button if Enter doesn't work
            try:
                await page.locator("button:has-text('Log In')").first.click(timeout=2000)
            except:
                pass
                
        elif await page.locator(old_login_selector).is_visible(timeout=5000):
            print("Detected Old Reddit Login Page")
            await page.locator(old_login_selector).fill(username)
            await page.locator("input[name='passwd']").fill(password)
            await page.locator("#login-form button[type='submit']").click()
        else:
            print("Could not detect standard login fields. Dumping page content...")
            raise Exception("Unknown login page structure")
        
    except Exception as e:
        print(f"Login interaction failed: {e}")
        # DEBUG: Print body text to see what happened
        try:
            body_text = await page.inner_text("body")
            print(f"--- PAGE CONTENT DEBUG ---\n{body_text[:500]}\n--------------------------")
        except:
            pass
        pass
    
    # Wait for redirect
    try:
        await page.wait_for_url("https://old.reddit.com/", timeout=15000)
        print("Login successful.")
    except:
        print("Login redirect timeout (might be captcha or 2FA or already logged in).")

async def publish_post(template_path, subreddit_name, dry_run=False):
    if not config.REDDIT_USERNAME or not config.REDDIT_PASSWORD:
        print("Error: REDDIT_USERNAME and REDDIT_PASSWORD are required in .env")
        return

    # Parse Template
    try:
        from .publisher import parse_template
        title, body = parse_template(template_path)
    except Exception as e:
        print(f"Template Error: {e}")
        return

    print(f"--- [Browser Mode] Preparing to Post to r/{subreddit_name} ---")
    print(f"Title: {title}")
    print(f"Body Preview: {body[:50]}...")
    
    if dry_run:
        print("[DRY RUN] Skipping browser automation.")
        return

    async with async_playwright() as p:
        # Launch browser with stealth args
        launch_args = {
            "headless": False,
            "args": ["--disable-blink-features=AutomationControlled"],
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "viewport": {"width": 1280, "height": 720},
            "locale": "en-US",
            "timezone_id": "America/New_York",
            "slow_mo": 100
        }
        
        # Use Proxy if configured
        if config.PROXY_SERVER:
            print(f"Using Proxy: {config.PROXY_SERVER}")
            launch_args["proxy"] = {"server": config.PROXY_SERVER}

        user_data_dir = os.path.abspath("marketing/reddit_bot/chrome_user_data")
        print(f"Using User Data Directory: {user_data_dir}")
        
        context = await p.chromium.launch_persistent_context(user_data_dir, **launch_args)
        
        if len(context.pages) > 0:
            page = context.pages[0]
        else:
            page = await context.new_page()
        
        # Apply Stealth
        stealth = Stealth()
        await page.add_init_script(stealth.script_payload)

        try:
            # 1. Login
            print("Checking login status...")
            try:
                await page.goto("https://www.reddit.com/", timeout=60000, wait_until="domcontentloaded")
            except Exception as e:
                print(f"Navigation warning: {e}")
                print("Continuing anyway - hoping the page loaded enough...")
            
            await page.wait_for_timeout(2000)
            
            # Check if blocked
            try:
                body_text = await page.inner_text("body")
                if "blocked by network security" in body_text.lower():
                    print("!!! BLOCKED BY REDDIT !!!")
                    print("Please manually refresh the browser window or solve the CAPTCHA.")
                    print("Waiting 60 seconds for manual intervention...")
                    await page.wait_for_timeout(60000)
            except:
                pass
            
            # Check if logged in (look for logout button or username)
            try:
                # FIRST: Check if we are definitely NOT logged in (Login form visible)
                if await page.locator("input[name='username']").is_visible() or await page.locator("input[name='user']").is_visible():
                    print("Login form detected - Not logged in.")
                    raise Exception("Login form visible")

                # If "logout" link exists (Old Reddit) OR User Dropdown (New Reddit)
                # New Reddit user dropdown usually has 'user-dropdown' in id or is a button with user profile
                if await page.locator("form.logout").is_visible() or await page.locator("#USER_DROPDOWN_ID").is_visible() or await page.locator("#email-verification-tooltip-id").is_visible():
                    print("Already logged in!")
                else:
                     # One more check for New Reddit header avatar
                    if await page.locator("button[id*='UserDropdown']").is_visible():
                        print("Already logged in (Found UserDropdown)!")
                    elif "welcome back" in body_text.lower() or "欢迎回来" in body_text:
                        print("Already logged in (Redirect page detected)!")
                    else:
                        print("Not logged in (No profile indicators). Starting login process...")
                        # Allow manual login if script fails
                        print(">>> PLEASE LOG IN MANUALLY IN THE BROWSER IF AUTOMATION FAILS <<<")
                        await login(page, config.REDDIT_USERNAME, config.REDDIT_PASSWORD)
            except Exception as e:
                print(f"Login check/attempt failed/needed: {e}")
                print(">>> PLEASE LOG IN MANUALLY IN THE BROWSER <<<")
                await login(page, config.REDDIT_USERNAME, config.REDDIT_PASSWORD)
            
            # Wait a bit after login to look human
            await page.wait_for_timeout(3000)

            # 2. Go to Submit Page
            submit_url = SUBMIT_URL_TEMPLATE.format(subreddit_name)
            print(f"Navigating to {submit_url}...")
            try:
                await page.goto(submit_url, timeout=60000, wait_until="domcontentloaded")
            except:
                 print("Submit page navigation timeout - continuing...")
                 
            await page.wait_for_timeout(5000) # Wait for JS to render
            
            # Check if redirected to login page again
            if await page.locator("input[name='username']").is_visible() or await page.locator("input[name='user']").is_visible():
                print("Redirected to Login Page after navigation! Attempting login again...")
                await login(page, config.REDDIT_USERNAME, config.REDDIT_PASSWORD)
                await page.wait_for_timeout(5000)
                # Check if we need to navigate back
                if "submit" not in page.url:
                     print(f"Re-navigating to {submit_url}...")
                     await page.goto(submit_url, timeout=60000, wait_until="domcontentloaded")
                     await page.wait_for_timeout(5000)

            # 3. Fill Form
            print("Filling title...")
            title_selectors = ["textarea[name='title']", "input[name='title']", "#post-title"]
            title_found = False
            for selector in title_selectors:
                try:
                    if await page.locator(selector).first.is_visible(timeout=2000):
                        print(f"Found title with selector: {selector}")
                        await page.locator(selector).first.fill(title)
                        title_found = True
                        break
                except:
                    continue
            
            if not title_found:
                print("Could not find Title field. Dumping inputs...")
                try:
                    inputs = await page.locator("input, textarea").all()
                    for i, inp in enumerate(inputs):
                         name = await inp.get_attribute("name")
                         ph = await inp.get_attribute("placeholder")
                         print(f"Input {i}: name={name}, placeholder={ph}")
                except:
                    pass
                raise Exception("Title field not found")

            print("Filling body...")
            body_found = False
            
            # STRATEGY 1: Try to switch to Markdown Mode (Most Reliable)
            print("Attempting to switch to Markdown Mode...")
            try:
                # Look for the "Switch to Markdown" button (New Reddit)
                # It might be "Markdown Editor" or just "Markdown"
                markdown_btn = page.locator("button:has-text('Markdown')").first
                if await markdown_btn.is_visible(timeout=3000):
                    print("Found Markdown switch button. Clicking...")
                    await markdown_btn.click()
                    await page.wait_for_timeout(1000)
            except:
                print("Could not find Markdown switch button (might already be in Markdown mode or using different UI).")

            # STRATEGY 2: Look for standard Textarea (Markdown Mode)
            print("Looking for body textarea...")
            body_selectors = [
                "textarea[name='text']", 
                "textarea[placeholder='Text (optional)']",
                "#post-text",
                "textarea[data-testid='post-body-textarea']"
            ]
            for selector in body_selectors:
                try:
                    # Check visibility
                    elem = page.locator(selector).first
                    if await elem.is_visible(timeout=1000):
                        # CRITICAL CHECK: Ensure this is NOT the title field
                        name_attr = await elem.get_attribute("name")
                        id_attr = await elem.get_attribute("id")
                        if name_attr == "title" or id_attr == "post-title":
                            print(f"Skipping selector {selector} because it matched the Title field!")
                            continue
                            
                        print(f"Found body textarea with selector: {selector}")
                        await elem.fill(body)
                        body_found = True
                        break
                except:
                    continue

            # STRATEGY 3: Rich Text Editor (DraftJS / ContentEditable)
            if not body_found:
                print("Textarea not found. Trying Rich Text Editor...")
                rich_text_selectors = [
                    "div[role='textbox']",
                    "div.public-DraftEditor-content",
                    "div[contenteditable='true']",
                    "div[data-testid='post-body-content']"
                ]
                
                for selector in rich_text_selectors:
                    try:
                        elem = page.locator(selector).first
                        if await elem.is_visible(timeout=2000):
                            # CRITICAL CHECK: Ensure this is NOT the title field (unlikely for div, but safe)
                            if await elem.get_attribute("name") == "title":
                                continue

                            print(f"Found Rich Text Editor: {selector}")
                            await elem.click()
                            await page.wait_for_timeout(500)
                            # Use insert_text for reliability in contenteditable
                            await page.keyboard.insert_text(body)
                            body_found = True
                            break
                    except:
                        continue
            
            if not body_found:
                 print("Warning: Could not find Body field. Trying generic fallback...")
                 try:
                     # INTELLIGENT FALLBACK: Find all textareas and pick the one that is NOT title
                     textareas = await page.locator("textarea").all()
                     for i, ta in enumerate(textareas):
                         if not await ta.is_visible():
                             continue
                             
                         name = await ta.get_attribute("name")
                         if name != "title":
                             print(f"Used generic fallback textarea (index {i}, name={name})")
                             await ta.fill(body)
                             body_found = True
                             break
                     
                     if not body_found:
                         print("No suitable fallback textarea found.")
                 except:
                     pass
            
            # Verification: Check if body actually has content
            # (Note: Hard to verify contenteditable easily without complex JS, but we can trust insert_text mostly)
            if body_found:
                print("Body filled (presumably).")
            else:
                print("CRITICAL WARNING: Body field was NOT filled.")

            # 4. Submit
            print("Clicking Submit...")
            submit_selectors = [
                "button:has-text('Post')",
                "button:has-text('Submit')",
                "button:has-text('发帖')",
                "button:has-text('发布')",
                "button[type='submit']",
                "#submit-button",
                "shreddit-post-button button"
            ]
            
            submit_found = False
            for selector in submit_selectors:
                try:
                    btn = page.locator(selector).first
                    if await btn.is_visible(timeout=2000):
                        print(f"Found submit button with selector: {selector}")
                        # Check if disabled
                        if await btn.is_disabled():
                            print("Submit button is disabled! Form might not be filled correctly.")
                            # Debug: print body value
                            # try:
                            #     val = await page.locator("textarea").nth(1).input_value()
                            #     print(f"Body value: {val[:50]}...")
                            # except:
                            #     pass
                        else:
                            await btn.click()
                            submit_found = True
                            break
                except:
                    continue
            
            if not submit_found:
                 print("Could not find Submit button. Dumping buttons...")
                 try:
                     buttons = await page.locator("button").all()
                     for i, btn in enumerate(buttons):
                         text = await btn.inner_text()
                         print(f"Button {i}: {text.strip()[:20]}")
                 except:
                     pass
                 raise Exception("Submit button not found")

            # 5. Verify Submission
            print("Waiting for post submission to complete...")
            try:
                # Wait for URL to contain '/comments/' which indicates successful post
                await page.wait_for_url(re.compile(r".*/comments/.*"), timeout=30000)
                print("Post submitted successfully! (URL pattern matched)")
            except:
                print("URL did not change to /comments/ pattern. Checking for errors...")
                # Check for common error messages
                if await page.locator("text='you are doing that too much'").is_visible():
                    print("ERROR: Rate limited (You are doing that too much).")
                elif await page.locator("text='Something went wrong'").is_visible():
                    print("ERROR: Generic Reddit error.")
                else:
                    print("Warning: verification timed out, but post might have succeeded. Check screenshot.")

            await page.wait_for_timeout(3000)
            await page.screenshot(path="marketing/reddit_bot/logs/success.png")
            
            # Keep browser open for manual inspection
            if not launch_args["headless"]:
                input("Press Enter to close browser...")

        except Exception as e:
            print(f"Automation Error: {e}")
            await page.screenshot(path="marketing/reddit_bot/logs/error.png")
            if not launch_args["headless"]:
                input("Press Enter to close browser (Error)...")
        
        finally:
            await context.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("template")
    parser.add_argument("--subreddit", default="test")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    
    asyncio.run(publish_post(args.template, args.subreddit, args.dry_run))
