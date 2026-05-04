
```javascript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const businessIdeaPrompt = `You are a business idea generator. Generate 3 creative and viable business ideas.
For each idea, provide:
1. Business Name
2. Description (2-3 sentences)
3. Target Market
4. Estimated Startup Cost (Low/Medium/High)
5. Potential Revenue Model
6. Key Challenges

Format your response as a JSON array with objects containing these fields.
Ensure the ideas are innovative, feasible, and have real market potential.`;

const validationPrompt = (businessIdea) => `You are a business consultant. Validate and score the following business idea on a scale of 1-10 for:
1. Market Viability
2. Innovation Level
3. Feasibility
4. Profitability Potential
5. Scalability

Business Idea:
${JSON.stringify(businessIdea, null, 2)}

Provide scores and brief explanations for each criterion.
Format your response as a JSON object with scores and reasoning.`;

async function generateBusinessIdeas() {
  console.log("🚀 Starting Business Idea Generator with Validation...\n");

  const conversationHistory = [];

  conversationHistory.push({
    role: "user",
    content: businessIdeaPrompt,
  });

  console.log("📝 Generating business ideas...\n");

  const ideasResponse = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2000,
    messages: conversationHistory,
  });

  const ideasContent = ideasResponse.content[0];
  if (ideasContent.type !== "text") {
    throw new Error("Unexpected response type");
  }
  const ideasText = ideasContent.text;

  conversationHistory.push({
    role: "assistant",
    content: ideasText,
  });

  let businessIdeas = [];
  const jsonMatch = ideasText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      businessIdeas = JSON.parse(jsonMatch[0]);
    } catch {
      console.log("Generated ideas (text format):");
      console.log(ideasText);
      businessIdeas = parseIdeasFromText(ideasText);
    }
  } else {
    businessIdeas = parseIdeasFromText(ideasText);
  }

  console.log("✅ Generated Ideas:\n");
  businessIdeas.forEach((idea, index) => {
    console.log(`\nIdea ${index + 1}: ${idea.businessName || idea.name || `Idea ${index + 1}`}`);
    console.log(
      `Description: ${idea.description || idea.Description || "N/A"}`
    );
    if (idea.targetMarket || idea["Target Market"]) {
      console.log(`Target Market: ${idea.targetMarket || idea["Target Market"]}`);
    }
    console.log("---");
  });

  console.log("\n🔍 Validating Business Ideas...\n");

  const validationResults = [];

  for (let i = 0; i < businessIdeas.length; i++) {
    const idea = businessIdeas[i];
    console.log(
      `Validating Idea ${i + 1}: ${idea.businessName || idea.name || `Idea ${i + 1}`}...`
    );

    conversationHistory.push({
      role: "user",
      content: validationPrompt(idea),
    });

    const validationResponse = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: conversationHistory,
    });

    const validationContent = validationResponse.content[0];
    if (validationContent.type !== "text") {
      throw new Error("Unexpected response type");
    }
    const validationText = validationContent.text;

    conversationHistory.push({
      role: "assistant",
      content: validationText,
    });

    let validationScore = {};
    const jsonMatch = validationText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        validationScore = JSON.parse(jsonMatch[0]);
      } catch {
        validationScore = parseValidationFromText(validationText);
      }
    } else {
      validationScore = parseValidationFromText(validationText);
    }

    validationResults.push({
      idea: idea,
      validation: validationScore,
    });
  }

  console.log("\n📊 VALIDATION RESULTS:\n");
  console.log("=".repeat(60));

  validationResults.forEach((result, index) => {
    const ideaName = result.idea.businessName || result.idea.name || `Idea ${index + 1}`;
    console.log(`\nIdea ${index + 1}: ${ideaName}`);
    console.log("-".repeat(40));

    const validation = result.validation;

    if (validation.scores) {
      Object.entries(validation.scores).forEach(([criterion, score]) => {
        console.log(`  ${criterion}: ${score}/10`);
      });
    } else if (validation["Market Viability"]) {
      console.log(
        `  Market Viability: ${validation["Market Viability"]}/10`
      );
      console.log(`  Innovation Level: ${validation["Innovation Level"]}/10`);
      console.log(`  Feasibility: ${validation["Feasibility"]}/10`);
      console.log(
        `  Profitability Potential: ${validation["Profitability Potential"]}/10`
      );
      console.log(`  Scalability: ${validation["Scalability"]}/10`);
    } else {
      console.log("Validation details:");
      console.log(JSON.stringify(validation, null, 2));
    }

    if (