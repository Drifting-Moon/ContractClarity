import os
import sys
from google import genai
from dotenv import load_dotenv

# Load .env file
load_dotenv()

def diagnose():
    print("🔍 DIAGNOSING GEMINI API CONNECTION (NEW SDK)...")

    # Try to get key from env or input
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        api_key = input("Please enter your Gemini API Key: ").strip()
    
    if not api_key:
        print("❌ ERROR: No API Key provided.")
        return

    print(f"✅ Found API Key: {api_key[:4]}...{api_key[-4:]}")

    try:
        client = genai.Client(api_key=api_key)
        
        # New SDK doesn't have a simple "list_models" like the old one that returns iterable easily in same format.
        # We will instead test the most common models directly.
        
        models_to_test = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.0-pro",
            "gemini-2.0-flash-exp"
        ]

        print("\n� Testing connectivity with common models...")
        
        working_model = None

        for model_name in models_to_test:
            print(f"\n👉 Testing Model: {model_name}")
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents="Hello, are you working?"
                )
                
                if response.text:
                    print(f"   ✅ SUCCESS! Response: {response.text[:50]}...")
                    if not working_model:
                        working_model = model_name
                else:
                    print("   ⚠️  No text returned.")

            except Exception as e:
                # Check for rate limits or other specific new SDK errors
                error_msg = str(e)
                if "429" in error_msg:
                    print("   ⛔ Rate Limit (429)")
                elif "404" in error_msg:
                    print(f"   ❌ Not Found (404) - Model might not be available for this key")
                else:
                    print(f"   ❌ FAILED: {error_msg}")
                                
        if working_model:                                                                    
            print(f"\n🎉 FOUND A WORKING MODEL: {working_model}")
            print(f"👉 Please enter this model name in the website: {working_model}")
        else:                                                                  
            print("\n❌ ALL tested models failed. Check your billing/quota status in Google AI Studio.")
            return
                                                    
    except Exception as e:
        print("\n❌ FAILURE: API Client Initialization Failed")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")

if __name__ == "__main__":
    diagnose()
