import sys
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
from langchain_core.tools import Tool

print("TOOLS.PY: About to instantiate DuckDuckGoSearchRun", file=sys.stderr, flush=True)
search = DuckDuckGoSearchRun()
print("TOOLS.PY: DuckDuckGoSearchRun instantiated", file=sys.stderr, flush=True)

search_tool = Tool(
    name="DuckDuckGoSearch",
    func=search.run,
    description="A powerful tool specifically designed to search the internet using the DuckDuckGo search engine.  It is ideal for answering questions that require up-to-date information, current events, facts, and real-time data. Use this tool whenever the user's query requires accessing the web to find relevant information.  If the question involves 'what is', 'current', 'latest' or any request that implies needing information from the internet, this tool MUST be used.",
)



if __name__ == "__main__":
    
    # Example usage
    query = "What is the capital of France?"
    result = search.invoke(query)
    print(f"Search result for '{query}': {result}")
#     # Example usage