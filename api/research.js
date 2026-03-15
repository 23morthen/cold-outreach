export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  const callClaude = async (messages) => {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: req.body.system,
        messages
      })
    })
    return r.json()
  }

  try {
    let messages = req.body.messages
    let data = await callClaude(messages)
    let iterations = 0

    // Agentic loop: keep going while Claude wants to use tools
    while (data.stop_reason === "tool_use" && iterations < 5) {
      iterations++

      // Collect all tool_use blocks
      const toolUseBlocks = data.content.filter(b => b.type === "tool_use")

      // Build tool_result blocks (web search results come back in content)
      const toolResults = data.content
        .filter(b => b.type === "tool_result" || b.type === "web_search_result")
        .map(b => ({ type: "tool_result", tool_use_id: b.tool_use_id || toolUseBlocks[0]?.id, content: JSON.stringify(b.content || b) }))

      // If no tool results in content, create empty ones (Claude handles it)
      if (toolResults.length === 0) {
        toolResults.push(...toolUseBlocks.map(b => ({
          type: "tool_result",
          tool_use_id: b.id,
          content: "Search executed successfully"
        })))
      }

      // Append assistant turn + tool results, then call again
      messages = [
        ...messages,
        { role: "assistant", content: data.content },
        { role: "user", content: toolResults }
      ]

      data = await callClaude(messages)
    }

    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
