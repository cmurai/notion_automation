import os
from notion_client import Client

# Read the secure token injected by GitHub Actions
NOTION_TOKEN = os.environ.get("NOTION_TOKEN")

# Retrieve database ID 
DATABASE_ID = os.environ.get("JOURNAL_DATABASE_ID")

# Initialize the Notion Client
notion = Client(auth=NOTION_TOKEN)

def run_automation():
    try:
        # Example Action: Create a daily recurring checklist item
        response = notion.pages.create(
            parent={"database_id": DATABASE_ID},
            properties={
                "Title": {
                    "title": [
                        {
                            "text": {
                                "content": "☀️ Daily Review & Log"
                            }
                        }
                    ]
                },
                "Date": {
                  "date": {
                    "start": "2026-08-19"
                  }
                }
            }
        )
        print("Success: Daily page generated.")
    except Exception as e:
        print(f"Error executing automation: {e}")

if __name__ == "__main__":
    run_automation()
