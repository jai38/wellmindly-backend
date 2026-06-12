import requests
import json
import os

api_key = "AIzaSyCQwT1zWK5i5PA6YioZw0Ck_lrnWU84-iw"

def test_endpoint(url_template, model):
    url = url_template.format(model=model, key=api_key)
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": "Say hello in one word"}]}]
    }
    
    print(f"Testing URL: {url.replace(api_key, 'API_KEY')}")
    try:
        response = requests.post(url, headers=headers, json=payload)
        print("Status Code:", response.status_code)
        print("Response:", response.text[:500])
        return response.status_code == 200
    except Exception as e:
        print("Error:", e)
        return False

# Test v1
print("=== Probing v1 ===")
test_endpoint("https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={key}", "gemini-1.5-flash")

# Test v1beta
print("\n=== Probing v1beta ===")
test_endpoint("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}", "gemini-1.5-flash")
