
import google.generativeai as genai
import os
import sys

def test_api_key():
    print("--- Gemini API Diagnosis ---")
    
    # Check library version
    try:
        import importlib.metadata
        version = importlib.metadata.version("google-generativeai")
        print(f"google-generativeai version: {version}")
    except Exception as e:
        print(f"Could not determine library version: {e}")

    api_key = input("Please enter your Gemini API Key: ").strip()
    
    if not api_key:
        print("Error: No API Key provided.")
        return

    print(f"\nChecking available models...")
    try:
        genai.configure(api_key=api_key)
        
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
                available_models.append(m.name)
        
        if not available_models:
            print("\n❌ NO MODELS FOUND that support generateContent.")
            return

        print(f"\n🔎 Testing models to find one that works (skipping 429/404 errors)...")
        
        working_model = None

        # Prioritize flash/lite models as they are usually faster/cheaper
        # Sort to put 'flash' or 'lite' first
        sorted_models = sorted(available_models, key=lambda x: 0 if 'flash' in x or 'lite' in x else 1)

        for model_name in sorted_models:
            print(f"   Testing: {model_name} ... ", end="", flush=True)
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content("Hi")
                
                if hasattr(response, 'text'):
                     print("✅ WORKING!")
                     working_model = model_name
                     break
                else:
                     print("❓ (No text returned)")

            except Exception as e:
                if "429" in str(e) or "ResourceExhausted" in str(e):
                    print("⛔ Rate Limit (429)")
                elif "404" in str(e) or "NotFound" in str(e):
                     print("❌ Not Found (404)")
                else:
                    print(f"❌ Error: {type(e).__name__}")
        
        if working_model:
            print(f"\n🎉 FOUND A WORKING MODEL: {working_model}")
            print(f"👉 Please enter this model name in the website: {working_model}")
        else:
            print("\n❌ ALL models failed. Check your billing/quota status in Google AI Studio.")
            return
            
    except Exception as e:
        print("\n❌ FAILURE: API Call Failed")
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        
        if "400" in str(e):
            print("\nPossible causes: API Key invalid, Project not enabled, or Billing issue.")
        elif "403" in str(e):
            print("\nPossible causes: Permission denied. Key might be restricted.")
        elif "404" in str(e):
            print("\nPossible causes: Model not found. 'gemini-1.5-flash' might not be available to this key.")
        
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api_key()
