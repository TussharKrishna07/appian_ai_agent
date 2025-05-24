# ShopSmarter: AI-Powered Personal Shopping Assistant for E-Commerce

<div align="center">
  <img src="https://img.shields.io/badge/Hackathon-ShopSmarter-blue" alt="Hackathon Badge">
  <img src="https://img.shields.io/badge/Team-AVTAR-red" alt="Team Badge">
  <img src="https://img.shields.io/badge/Python-3.11+-green" alt="Python Version">
  <img src="https://img.shields.io/badge/React-18+-blue" alt="React Version">
  <img src="https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-orange" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/AI-Gemini%202.0-purple" alt="AI Model">
</div>

## 🚀 Project Overview

**ShopSmarter** is an intelligent AI-powered Personal Shopping Assistant that revolutionizes the e-commerce experience by understanding visual inputs and automating the shopping process. Our system analyzes images of apparel, accessories, home decor, gadgets, and other products to suggest similar or complementary items, creating a truly personalized shopping journey.

### 🎯 Hackathon Problem Statement
*"Design and develop an AI-powered Personal Shopping Assistant that personalises the shopping experience for an e-commerce website and also automates the process. The system should understand visual inputs (such as apparel, accessories, home decor, gadgets, etc.) and suggest similar or complementary products available in the store."*

### 💡 Our Solution
ShopSmarter addresses this challenge through a comprehensive AI-driven platform that combines:
- **Advanced Computer Vision**: Multi-modal AI for understanding diverse product categories
- **Intelligent Recommendation Engine**: Context-aware suggestions for similar and complementary products
- **Automated Shopping Process**: Streamlined discovery-to-purchase workflow
- **Cross-Platform Integration**: Seamless experience across web and browser extension

## ✨ Salient Features of Our Codebase

### 🧠 **1. Multi-Modal AI Agent Architecture (`ai_agent.py`)**
Our core AI system leverages **LangGraph** with **Google Gemini 2.0 Flash** for sophisticated visual understanding:

```python
# Advanced state management with memory persistence
class State(TypedDict):
    messages: Annotated[list, add_messages]

# Multi-modal processing for images and text
llm = init_chat_model("gemini-2.0-flash", model_provider="google_genai")
llm_with_tools = llm.bind_tools([search_tool])
```

**Key Capabilities:**
- **Visual Product Analysis**: Identifies clothing styles, home decor themes, gadget specifications
- **Brand Recognition**: Detects and suggests similar branded products
- **Style Categorization**: Understands fashion aesthetics, interior design styles
- **Contextual Understanding**: Distinguishes between product categories (apparel vs. home decor vs. gadgets)

### 🔍 **2. Intelligent Search Integration (`tools.py`)**
Real-time product discovery through DuckDuckGo search integration:

```python
search_tool = Tool(
    name="DuckDuckGoSearch",
    func=search.run,
    description="A powerful tool for finding up-to-date product information and recommendations"
)
```

**Features:**
- Real-time e-commerce data fetching
- Product availability verification
- Price comparison across platforms
- Trend-aware recommendations

### 🌐 **3. RESTful API Backend (`app.py`)**
Flask-powered backend supporting multi-modal interactions:

```python
@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.form.get("message", "")
    image_file = request.files.get("image", None)
    
    # Multi-modal request processing
    user_request = [
        {"type": "text", "text": user_message},
        {"type": "image", "source_type": "base64", "data": image_data}
    ]
```

**Capabilities:**
- **Image Upload Processing**: Handles multiple image formats (JPEG, PNG, WebP)
- **Base64 Encoding**: Efficient image data transmission
- **Thread Management**: Persistent conversation history
- **CORS Support**: Cross-origin resource sharing for web integration

### 🎨 **4. Modern React Frontend (`ai_agent_interface/`)**
Responsive web application with rich user interactions:

```jsx
// Multi-modal message handling
const sendMessage = async () => {
    const formData = new FormData();
    if (trimmed) formData.append('message', trimmed);
    if (image) formData.append('image', image);
    
    // Real-time AI response processing
    const data = await res.json();
    setChatHistory(prev => [...prev, { role: 'assistant', content: replyContent }]);
};
```

**Features:**
- **Drag-and-Drop Image Upload**: Intuitive file handling
- **Real-time Chat Interface**: Instant AI responses
- **Markdown Support**: Rich text formatting for product links
- **Responsive Design**: Mobile-first approach
- **Image Preview**: Visual confirmation before sending

### 🔧 **5. Chrome Extension Integration (`ai_agent_extension/`)**
Seamless browser integration for in-page shopping assistance:

```javascript
// Advanced screen capture functionality
function captureSelectedArea(left, top, width, height) {
    chrome.runtime.sendMessage({
        action: 'captureTab',
        area: { left, top, width, height }
    });
}
```

**Advanced Features:**
- **Area Selection Tool**: Precise product capture from any website
- **Cross-tab Synchronization**: Persistent chat across browser tabs
- **Dynamic Sidebar**: Resizable and responsive UI
- **Background State Management**: Maintains shopping context

### 🤖 **6. Intelligent Product Recommendation System**
Our AI system provides sophisticated product suggestions:

#### **Similar Product Discovery**
- Analyzes visual features (color, style, pattern, material)
- Matches products across different e-commerce platforms
- Considers price ranges and availability

#### **Complementary Product Suggestions**
- **Fashion**: Suggests matching accessories, shoes, bags for outfits
- **Home Decor**: Recommends coordinating furniture, lighting, textiles
- **Gadgets**: Proposes compatible accessories and complementary devices

#### **Category-Specific Intelligence**
```python
system_prompt = """
You are an intelligent Amazon Personal Shopping Assistant. Your core function is to analyze 
user-provided images and text queries to offer relevant product recommendations.

- **Fashion**: Offer similar items, style variations, or complementary accessories
- **Home**: Suggest lamps, curtains, rugs, or furniture that complement the style
- **Gadgets**: Recommend compatible accessories and related technology products
"""
```

### 📊 **7. Conversation Memory & State Management**
Persistent shopping context across sessions:

```python
# Memory-enabled conversation tracking
memory = MemorySaver()
graph = graph_builder.compile(checkpointer=memory)

def get_state(thread_id: str = "1") -> dict:
    config = {"configurable": {"thread_id": thread_id}}
    return graph.get_state(config=config)
```

**Benefits:**
- **Shopping History**: Maintains user preferences and past searches
- **Context Continuity**: Remembers previous product discussions
- **Cross-Session Persistence**: Resumes conversations seamlessly


**Features:**
- **Smart URL Generation**: Creates optimized Amazon search links
- **Product-Specific Queries**: Includes identified brands, styles, and specifications
- **Price-Aware Suggestions**: Considers budget ranges when available

## 🏗️ Architecture Overview

### System Flow
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Visual Input  │    │   AI Analysis   │    │  Recommendations│
│                 │    │                 │    │                 │
│ • Image Upload  │───►│ • Gemini Vision │───►│ • Similar Items │
│ • Screen Capture│    │ • Style Analysis│    │ • Complementary │
│ • Product Photos│    │ • Brand ID      │    │ • Amazon Links  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack Innovation

**AI & Machine Learning:**
- **Google Gemini 2.0 Flash**: State-of-the-art vision-language model
- **LangGraph**: Advanced AI agent orchestration
- **LangChain**: Tool integration and memory management
- **Multi-modal Processing**: Simultaneous text and image understanding

**Backend Architecture:**
- **Flask**: Lightweight, scalable REST API
- **Python 3.11+**: Modern language features and performance
- **Base64 Encoding**: Efficient image data handling
- **CORS**: Cross-origin support for web integration

**Frontend Innovation:**
- **React 18+**: Modern component architecture
- **Vite**: Lightning-fast development and build
- **React Markdown**: Rich content rendering
- **CSS Grid/Flexbox**: Responsive layout design

**Browser Integration:**
- **Manifest V3**: Latest Chrome extension standards
- **Service Workers**: Background processing
- **Content Scripts**: Page interaction and capture
- **Message Passing**:
```

### Frontend Production Build
```bash
cd ai_agent_interface

# Build for production
npm run build

# Serve static files (dist folder)
npm run preview
```

### Chrome Extension Distribution
```bash
# From ai_agent_extension directory
# Zip the entire folder for Chrome Web Store submission
zip -r primesty-extension.zip . -x "*.git*" "node_modules/*"
```

## 📁 Project Structure
```
appian_ai_agent/
├── ai_agent.py              # Core AI agent with LangGraph
├── app.py                   # Flask backend server
├── tools.py                 # AI tools (search, etc.)
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables
├── ai_agent_interface/      # React frontend
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── App.css         # Styling
│   │   └── main.jsx        # Entry point
│   ├── package.json        # Node dependencies
│   └── vite.config.js      # Build configuration
├── ai_agent_extension/      # Chrome extension
│   ├── manifest.json       # Extension configuration
│   ├── background.js       # Service worker
│   ├── content.js          # Page interaction
│   ├── sidebar.html        # Extension UI
│   └── popup.html          # Extension popup
└── images/                  # Sample fashion images
```

## 🤝 Contributing

We welcome contributions to PrimeSty! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini for powerful vision capabilities
- LangChain community for excellent AI frameworks
- React team for the amazing frontend framework
- All open-source contributors who made this project possible

---

<div align="center">
  <strong>Built with ❤️ by Team AVTAR for APPIAN Hackathon</strong>
</div>