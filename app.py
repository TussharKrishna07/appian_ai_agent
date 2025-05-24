import os
import base64
import httpx
from PIL import Image
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from ai_agent import run_agent
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

@app.route('/chat', methods=['POST'])
def chat():
    
    user_message = request.form.get("message", "")
    image_file = request.files.get("image",None)
    thread_id = request.form.get("thread_id", "1")  # Default to thread_id "1"

    print("User message:", user_message)
    print("Image file:", image_file)
    print("Thread ID:", thread_id)

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
        reply = run_agent(user_request,thread_id)  # type: ignore
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    # finally:
        # # Clean up the image file after processing
        # if image_path and os.path.exists(image_path):
        #     os.remove(image_path)


@app.route('/chat', methods=['GET'])
def get_chat_state():
    # Get the current state of the model
    thread_id = request.args.get('thread_id', '1')  # Default to thread_id "1"
    
    try:
        from ai_agent import get_state
        state = get_state(thread_id)
        
        # Extract messages and format them for frontend
        messages = []
        if state.values.get("messages"): # type: ignore
            for msg in state.values["messages"]: # type: ignore
                # Skip system messages
                if hasattr(msg, 'type') and msg.type == 'system':
                    continue
                    
                # Format message for frontend
                role = 'user' if msg.type == 'human' else 'assistant'
                content = msg.content
                
                # Handle different content types (text vs multimodal)
                if isinstance(content, list):
                    # Extract text and image data from multimodal content
                    text_content = ""
                    image_data = None
                    
                    for item in content:
                        if item.get("type") == "text":
                            text_content = item.get("text", "")
                        elif item.get("type") == "image":
                            image_data = item.get("data")
                    
                    messages.append({
                        "role": role,
                        "content": text_content,
                        "image": f"data:image/jpeg;base64,{image_data}" if image_data else None
                    })
                else:
                    messages.append({
                        "role": role,
                        "content": content,
                        "image": None
                    })
        
        return jsonify({"messages": messages})
    except Exception as e:
        return jsonify({"error": str(e), "messages": []}), 500

if __name__ == '__main__':
    app.run(debug=True)
