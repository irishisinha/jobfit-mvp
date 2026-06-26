const testResume = "John Doe\nExperience: Led marketplace platform\nSkills: Backend development"
const testJob = "We need someone with circular economy and C2C strategy experience"
const testKeywords = ["circular economy", "C2C strategy", "integration"]

const prompt = `You are a resume optimizer. Your job is to CLEARLY mark all changes made to a resume.

CRITICAL RULES:
1. Return the resume with EXACT formatting preserved
2. WHENEVER you add or modify text to include a keyword, wrap the CHANGED PART in [[[HIGHLIGHT_START]]] and [[[HIGHLIGHT_END]]]
3. ONLY mark actual keyword additions - do not mark anything else
4. If you replace a word, mark ONLY the new word
5. Format: [[[HIGHLIGHT_START]]]new keyword here[[[HIGHLIGHT_END]]]
6. NO OTHER CHANGES - preserve everything exactly

ORIGINAL RESUME:
${testResume}

JOB KEYWORDS TO ADD: ${testKeywords.join(", ")}

Return the resume with keywords strategically added and clearly marked with highlight tags.`

console.log("PROMPT:")
console.log(prompt)
