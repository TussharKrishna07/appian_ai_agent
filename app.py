import os
import base64
import httpx
from PIL import Image
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_agent import run_agent

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

@app.route('/chat', methods=['POST'])
def chat():
    
    user_message = request.form.get("message", "")
    image_file = request.files.get("image",None)

    print("User message:", user_message)
    print("Image file:", image_file)

    print(image_file)

    if not user_message.strip() and not image_file:
        return jsonify({"error": "Message and image both are empty"}), 400


    image_data = None
    mime_type = None
    if image_file is not None:
        # image_data = base64.b64encode(httpx.get(image_url).content).decode("utf-8")
        print("Image file is not None")
        image_bytes = image_file.read()
        # image = Image.open(BytesIO((image_bytes)))
        # image.save('sample.png')
        # image.show()
        image_data = base64.b64encode(image_bytes).decode("utf-8")
        mime_type = image_file.mimetype
 
    if image_data is None:
        user_request = [                                
                {
                  "type": "text",
                  "text": user_message,
                },
            ]
    else:
        user_request = [
                    {
                    "type": "text",
                    "text": user_message,
                    },
                    {
                    "type": "image",
                    "source_type": "base64",
                    "data": image_data,  # Read the image data
                    "mime_type": "image/jpeg",
                    },
                ]   
    try:
        # Pass both the message and the image path to the agent
        reply = run_agent(user_request)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    # finally:
        # # Clean up the image file after processing
        # if image_path and os.path.exists(image_path):
        #     os.remove(image_path)

if __name__ == '__main__':
    app.run(debug=True)
