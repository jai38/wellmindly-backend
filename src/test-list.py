import requests
import json

api_key = "AIzaSyCQwT1zWK5i5PA6YioZw0Ck_lrnWU84-iw"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

try:
    response = requests.get(url)
    print("Status Code:", response.status_code)
    print("Response:", json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)
