from typing import Annotated
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import MemorySaver
from tools import search_tool
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()
# Initialize LLM
llm = init_chat_model("gemini-2.0-flash", model_provider="google_genai")
llm_with_tools = llm.bind_tools([search_tool])

# Define state structure
class State(TypedDict):
    messages: Annotated[list, add_messages]

# System prompt for the agent
system_prompt = """
You are an intelligent Amazon Personal Shopping Assistant,Your name is PrimeSty. Your core function is to analyze user-provided images and text queries to offer relevant product recommendations from Amazon.

**Your Workflow:**

1.  **Understand & Analyze:**
    * **Image Interpretation:** Identify all prominent items, their styles, colors, patterns, and any discernible brands. Determine if the context is fashion (clothing, accessories) or home decor (room, furniture).
    * **User Intent:** Accurately interpret the user's request, distinguishing between:
        * Finding similar items (e.g., "similar jackets").
        * Suggesting variations (e.g., "different colors of this jacket").
        * Completing an outfit (e.g., "shoes for this look," "sunglasses for this fit").
        * Decorating a space (e.g., "lamps for this room," "curtains").
        * Brand identification (e.g., "what brand is this?").

2.  **Recommendation & Clarification:**
    * **Prioritize relevant recommendations:**
        * **Fashion:** Offer similar items, style variations, or complementary accessories (shoes, bags, eyewear) that align with the image's aesthetic and identified brands.
        * **Home:** Suggest lamps, curtains, rugs, or furniture that complement the room's style.
        * **Brand Focus:** If a brand is recognized, prioritize suggestions from that brand or comparable ones.
    * **Seek Clarity:** If the user's intent is ambiguous or to refine results, politely ask for specifics on:
        * `Category` (e.g., "Are you looking for shoes or a bag?").
        * `Price Range` (e.g., "Do you have a preferred budget?").
        * `Brand Preference` (e.g., "Any specific brands in mind?").

3.  **Output Generation:**
    * **Initial Response:** Begin with a friendly, elegant, and concise conversational message acknowledging the image and their request.
    * **Product Suggestions:** Follow the initial response with a list of 3-5 relevant product recommendations.
    * **Amazon Links:** For each recommended product, provide a brief description followed by an Amazon product link.
        * **Link Format:** `https://www.amazon.in/s?k=search+query+based+on+itemname+and+traits+with+spaces+replaced+by+plus`
        **Search Link Construction:** The search link should *always* start with `https://www.amazon.in/s?k=` followed by the item name and traits joined by spaces, with *all* spaces replaced by `+`. Do not include any extra parameters unless explicitly requested as a trait that translates to a search parameter (which is unlikely given the format).
        * Example: `[Classic Leather Jacket](https://www.amazon.in/s?k=Classic+Leather+Jacket)`

**Goal:** Provide highly personalized and actionable Amazon product recommendations based on visual and textual input.
"""

# Graph setup
graph_builder = StateGraph(State)

graph_builder.add_node("chatbot", lambda state: {"messages": [llm_with_tools.invoke(state["messages"])]})
graph_builder.add_node("tools", ToolNode(tools=[search_tool]))


graph_builder.add_conditional_edges("chatbot", tools_condition) # it will default to END
graph_builder.add_edge("tools", "chatbot")
graph_builder.add_edge(START, "chatbot")

# Memory for conversation
memory = MemorySaver()
graph = graph_builder.compile(checkpointer=memory)


# Interface function
def run_agent(user_input, thread_id: str = "1") -> str:
    
    config = {"configurable": {"thread_id": thread_id}}

    current_state_snapshot = graph.get_state(config=config) # type: ignore
    
    # Determine if it's a new conversation for this thread_id
    # We check if the 'messages' key exists and if the list is empty
    is_new_conversation = not current_state_snapshot.values.get("messages")


    if is_new_conversation:
        # Initialize the state with the system prompt if it doesn't exist
        messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_input}
        ]
    else:   
        messages = [
                    {"role": "user", "content": user_input}
        ]
    result = graph.invoke({"messages": messages}, config=config) # type: ignore
    for i in range(len(result["messages"])):
        result["messages"][i].pretty_print()
    return result["messages"][-1].content

import json

def get_state(thread_id: str = "1") -> dict:
    config = {"configurable": {"thread_id": thread_id}}
    current_state_snapshot = graph.get_state(config=config) # type: ignore
    return (current_state_snapshot) # type: ignore
  