import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface FormData {
  positionName: string
  languages: string[]
  problem: string
  hint: string
  type: 'complete_code' | 'write_code'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  topic: string
}

interface Question {
  id: string
  title: string
  problemStatement: string
  inputFormat: string
  outputFormat: string
  constraints: string
  sampleInput: string
  sampleOutput: string
  language?: string
  implementation?: string
  hint?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData: FormData = await request.json()

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    if (formData.type === 'write_code') {
      // For write_code, generate only problem statements (no code)
      const basePrompt = generateBaseOnlyPrompt(formData)
      const result = await model.generateContent(basePrompt)
      const response = await result.response
      const text = response.text()
      
      const baseQuestions = parseBaseQuestions(text)
      
      // Add language labels to each question
      const questionsWithLanguages = []
      for (const question of baseQuestions) {
        for (const language of formData.languages) {
          questionsWithLanguages.push({
            ...question,
            id: `${question.id}-${language}`,
            language: language
          })
        }
      }
      
      return NextResponse.json({ questions: questionsWithLanguages })
    } else {
      // For complete_code, generate with function templates
      const combinedPrompt = generateCombinedPrompt(formData)
      const result = await model.generateContent(combinedPrompt)
      const response = await result.response
      const text = response.text()

      const allQuestions = parseQuestionsWithImplementations(text, formData)
      return NextResponse.json({ questions: allQuestions })
    }
  } catch (error) {
    console.error('Error generating questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}

function generateCombinedPrompt(formData: FormData): string {
  const companyExamples = {
    // Senior Positions
    'Software Engineer': 'Google India, Microsoft India, Amazon India, Adobe India',
    'Full Stack Developer': 'Flipkart, Paytm, Zomato, Swiggy, MakeMyTrip',
    'Backend Python Developer': 'Amazon India, Flipkart, Zomato, Swiggy, Ola',
    'Python Developer': 'TCS, Infosys, Wipro, HCL, Accenture, Tech Mahindra',
    'React.js Developer': 'Flipkart, Swiggy, Zomato, PhonePe, Myntra',
    'Node.js Developer': 'Paytm, Flipkart, Zomato, Swiggy, Ola',
    'DevOps Engineer': 'Amazon India, Microsoft India, Flipkart, Paytm',
    'AWS DevOps Engineer': 'Amazon India, Flipkart, Paytm, Zomato, Swiggy',
    'Cloud Developer': 'Amazon India, Microsoft India, Google India, IBM India',
    'MERN Stack Developer': 'Flipkart, Paytm, Zomato, Swiggy, MakeMyTrip',
    'Java Developer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra, Oracle',
    'Front-end Developer': 'Flipkart, Paytm, Myntra, Zomato, Amazon India',
    'Back-end Developer': 'Amazon India, Flipkart, Google India, Microsoft India',
    'Blockchain Developer': 'WazirX, CoinDCX, Polygon, Zebpay, BitBNS',
    'Salesforce Developer': 'TCS, Infosys, Accenture, Wipro, Deloitte',
    'Software Developer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra',
    
    // Junior/Entry Level Positions
    'Associate Software Engineer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra',
    'Junior Front-End Developer': 'Flipkart, Paytm, Zomato, Swiggy, MakeMyTrip',
    'Junior Back-End Developer': 'Amazon India, Flipkart, Google India, Microsoft India',
    'Full-Stack Developer Intern': 'Flipkart, Paytm, Zomato, Swiggy, Amazon India',
    'Software Developer Trainee': 'TCS, Infosys, Wipro, HCL, Accenture',
    'Mobile App Developer (Trainee)': 'Flipkart, Paytm, Ola, Uber India, MakeMyTrip',
    'Cloud Support Associate': 'Amazon India, Microsoft India, Google India, IBM India',
    'IT Support Engineer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra',
    'QA/Test Engineer': 'TCS, Infosys, Wipro, Amazon India, Flipkart',
    'Technical Support Executive': 'Amazon India, Flipkart, Microsoft India, Google India',
    'Web Developer Intern': 'TCS, Infosys, Wipro, Flipkart, Paytm',
    'Application Support Engineer': 'TCS, Infosys, Wipro, HCL, Accenture',
    'Graduate Engineer Trainee': 'TCS, Infosys, Wipro, HCL, Tech Mahindra'
  }

  const relevantCompanies = companyExamples[formData.positionName as keyof typeof companyExamples] || 'top Indian IT companies'

  const difficultyGuidelines = {
    'easy': 'Basic implementation problems, simple algorithms, straightforward logic. Suitable for 0-2 years experience.',
    'medium': 'Moderate complexity, requires good understanding of data structures and algorithms. Suitable for 2-5 years experience.',
    'hard': 'Complex problems requiring advanced algorithmic thinking and optimization. Suitable for 5+ years experience.'
  }

  const languageList = formData.languages.join(', ')
      const isFromScratch = formData.type === 'write_code'

  return `
You are an expert interviewer from ${relevantCompanies}. Generate exactly 5 high-quality Data Structures and Algorithms questions for ${formData.positionName} position interviews.

CONTEXT:
- Target Companies: ${relevantCompanies}
- Position: ${formData.positionName}
- Topic Focus: ${formData.topic}
- Difficulty: ${formData.difficultyLevel} (${difficultyGuidelines[formData.difficultyLevel as keyof typeof difficultyGuidelines]})
- Question Type: ${isFromScratch ? 'Complete Implementation' : 'Function Templates Only'}
- Languages Required: ${languageList}
${formData.problem ? `- Additional Context: ${formData.problem}` : ''}
${formData.hint ? `- Hint/Focus: ${formData.hint}` : ''}

FORMAT for each question:

QUESTION [NUMBER]:
Title: [Concise, interview-style title]
Problem Statement: [Clear, detailed problem description]
Input Format: [Precise input specification. Use the exact bracket, quote, and whitespace style as in the sample below.]
Output Format: [Clear output specification. Use the exact bracket, quote, and whitespace style as in the sample below.]
Constraints: [Realistic constraints and complexity expectations]
Sample Input: [Simple test case. Use the exact formatting, spacing, and style as in the sample below.]
Sample Output: [Correct corresponding output. Use the exact formatting, spacing, and style as in the sample below.]
Hint: [CRITICAL: Plain English text ONLY! Max 50 words. ABSOLUTELY NO CODE, NO FUNCTION TEMPLATES, NO PROGRAMMING SYNTAX, NO LANGUAGE NAMES. Example: 'Explore dynamic programming or a more efficient approach that avoids brute force enumeration.' DO NOT include JAVA_TEMPLATE, function declarations, or any programming code.]

${isFromScratch ? `COMPLETE IMPLEMENTATIONS:` : `FUNCTION TEMPLATES:`}
${formData.languages.map(lang => {
  if (isFromScratch) {
    return `${lang.toUpperCase()}_IMPLEMENTATION: [Complete working solution in ${lang} with proper input/output handling, comments, and full logic. Use the exact function signature, comment style, and indentation as in the sample below. Do not change whitespace or formatting.]`
  } else {
    return `${lang.toUpperCase()}_TEMPLATE: [Function skeleton only - signature with "// Your code here" comment, no solution logic. Use the exact formatting and style as in the sample below.]`
  }
}).join('\n')}

SAMPLE TEMPLATE FORMATS (use exact style):

JAVASCRIPT_TEMPLATE:
/**
* @param {number[]} arr
* @param {number} k
* @return {number}
*/
const findKthLargest = (arr, k) => {
    // Your code here
};

PYTHON_TEMPLATE:
def find_kth_largest(arr: list[int], k: int) -> int:
    """
    Find the kth largest element in array
    """
    # Your code here

JAVA_TEMPLATE:
class Solution {
    /**
     * @param int[] arr
     * @param int k
     * @return int
     */
    public int findKthLargest(int[] arr, int k) {
        // Your code here
    }
}

Input:
[
["5","3",".",".","7",".",".",".","."],
["6",".",".","1","9","5",".",".","."],
[".","9","8",".",".",".",".","6","."],
["8",".",".",".","6",".",".",".","3"],
["4",".",".","8",".","3",".",".","1"],
["7",".",".",".","2",".",".",".","6"],
[".","6",".",".",".",".","2","8","."],
[".",".",".","4","1","9",".",".","5"],
[".",".",".",".","8",".",".","7","9"]
]
Output: Solved Sudoku board

${isFromScratch ? `
IMPLEMENTATION REQUIREMENTS:
- Generate complete, runnable solutions
- Include proper input/output handling  
- Add comments explaining the approach
- Follow language best practices
- Handle edge cases mentioned in constraints
- Include main function or entry point if needed
- Use the exact formatting, spacing, and comment style as in the sample above for all code, input, and output. Do not change whitespace or formatting.
` : `
TEMPLATE REQUIREMENTS:
- Generate ONLY function signatures with meaningful parameter names
- Include appropriate data types for each language
- Add only "// Your code here" comment in function body
- Include return statement placeholder if applicable
- DO NOT include any solution logic, implementation, or algorithm
- Keep minimal - just empty function shells
- MUST include EXACTLY the format: JAVASCRIPT_TEMPLATE:, PYTHON_TEMPLATE:, etc.
- Use the exact formatting, spacing, and comment style as in the sample above for all code, input, and output. Do not change whitespace or formatting.
`}

QUALITY REQUIREMENTS:
1. 🎯 AUTHENTICITY: Real interview patterns from ${relevantCompanies}
2. 🏢 COMPANY RELEVANCE: Match ${formData.positionName} interview style
3. 📊 DIFFICULTY: Appropriate for ${formData.difficultyLevel} level
4. 🔍 TOPIC MASTERY: Focus on ${formData.topic} concepts and patterns
5. 💡 CLARITY: Unambiguous problem statements
6. 🧪 TESTABILITY: Good sample inputs covering typical scenarios
7. ⚡ OPTIMIZATION: Include complexity discussions
8. 🎨 VARIETY: Test different aspects of ${formData.topic}
9. 💡 HINTS: CRITICAL - Generate ONLY plain English text hints (max 50 words). ABSOLUTELY NO CODE, FUNCTION NAMES, PROGRAMMING SYNTAX, or TEMPLATES. Example: 'Use sliding window technique' NOT 'JAVA_TEMPLATE: function()'

Generate 5 distinct questions with ${isFromScratch ? 'complete implementations' : 'function templates'} in all requested languages (${languageList}).
`
}

function parseQuestionsWithImplementations(text: string, formData: FormData) {
  const allQuestions = []
  const questionBlocks = text.split(/QUESTION \d+:/i).slice(1)

  for (let i = 0; i < questionBlocks.length && i < 5; i++) {
    const block = questionBlocks[i].trim()
    
    try {
      const titleMatch = block.match(/Title:\s*(.+?)(?=\n)/i)
      const problemMatch = block.match(/Problem Statement:\s*([\s\S]+?)(?=Input Format:)/i)
      const inputMatch = block.match(/Input Format:\s*([\s\S]+?)(?=Output Format:)/i)
      const outputMatch = block.match(/Output Format:\s*([\s\S]+?)(?=Constraints:)/i)
      const constraintsMatch = block.match(/Constraints:\s*([\s\S]+?)(?=Sample Input:)/i)
      const sampleInputMatch = block.match(/Sample Input:\s*([\s\S]+?)(?=Sample Output:)/i)
      const sampleOutputMatch = block.match(/Sample Output:\s*([\s\S]+?)(?=Hint:|COMPLETE IMPLEMENTATIONS:|FUNCTION TEMPLATES:)/i)
      const hintMatch = block.match(/Hint:\s*([\s\S]+?)(?=COMPLETE IMPLEMENTATIONS:|FUNCTION TEMPLATES:|$)/i)

      // Clean hint text - remove any code templates or programming syntax
      const cleanHint = (hintText: string): string => {
        if (!hintText) return ''
        
        // Remove any code blocks, function templates, and programming syntax
        let cleaned = hintText
          .replace(/```[\s\S]*?```/g, '') // Remove code blocks
          .replace(/JAVA_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove JAVA_TEMPLATE
          .replace(/PYTHON_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove PYTHON_TEMPLATE  
          .replace(/JAVASCRIPT_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove JAVASCRIPT_TEMPLATE
          .replace(/CPP_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove CPP_TEMPLATE
          .replace(/CSHARP_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove CSHARP_TEMPLATE
          .replace(/GO_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove GO_TEMPLATE
          .replace(/RUST_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove RUST_TEMPLATE
          .replace(/TYPESCRIPT_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove TYPESCRIPT_TEMPLATE
          .replace(/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
          .replace(/\/\/.*$/gm, '') // Remove // comments
          .replace(/\{[\s\S]*?\}/g, '') // Remove { } blocks
          .replace(/\([\s\S]*?\)/g, '') // Remove function parentheses
          .replace(/class\s+\w+[\s\S]*?(?=\n\n|$)/gi, '') // Remove class definitions
          .replace(/function\s+\w+[\s\S]*?(?=\n\n|$)/gi, '') // Remove function definitions
          .replace(/def\s+\w+[\s\S]*?(?=\n\n|$)/gi, '') // Remove Python function definitions
          .replace(/public\s+.*?(?=\n\n|$)/gi, '') // Remove public methods
          .replace(/private\s+.*?(?=\n\n|$)/gi, '') // Remove private methods
          .trim()
        
        // Take only the first line/sentence if it's clean text
        const firstSentence = cleaned.split(/[.!?]\s+/)[0]
        if (firstSentence && firstSentence.length > 10 && firstSentence.length < 200 && !firstSentence.includes('{') && !firstSentence.includes('(')) {
          return firstSentence
        }
        
        return cleaned.slice(0, 200).trim() // Limit to 200 chars max
      }

      const baseQuestion = {
        id: `question-${Date.now()}-${i}`,
        title: titleMatch?.[1]?.trim() || `Question ${i + 1}`,
        problemStatement: problemMatch?.[1]?.trim() || 'Problem statement not found',
        inputFormat: inputMatch?.[1]?.trim() || 'Input format not specified',
        outputFormat: outputMatch?.[1]?.trim() || 'Output format not specified',
        constraints: constraintsMatch?.[1]?.trim() || 'Constraints not specified',
        sampleInput: sampleInputMatch?.[1]?.trim() || 'Sample input not provided',
        sampleOutput: sampleOutputMatch?.[1]?.trim() || 'Sample output not provided',
        hint: cleanHint(hintMatch?.[1]?.trim() || '')
      }

      // Extract implementations for each language
      for (const language of formData.languages) {
        const langKey = formData.type === 'write_code' 
          ? `${language.toUpperCase()}_IMPLEMENTATION:` 
          : `${language.toUpperCase()}_TEMPLATE:`
        
        // Try multiple regex patterns to find the implementation/template
        let implementation = ''
        
        // Pattern 1: Exact match with LANGUAGE_TEMPLATE:
        const exactMatch = block.match(new RegExp(`${langKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([\\s\\S]+?)(?=${formData.languages.map(l => 
          formData.type === 'write_code' 
            ? `${l.toUpperCase()}_IMPLEMENTATION:` 
            : `${l.toUpperCase()}_TEMPLATE:`
        ).filter(k => k !== langKey).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|QUESTION|$)`, 'i'))
        
        if (exactMatch) {
          implementation = exactMatch[1].trim()
        } else {
          // Pattern 2: Look for the language name followed by any code block
          const langPattern = new RegExp(`${language.toUpperCase()}[\\s\\S]*?\\n([\\s\\S]+?)(?=\\n\\n|${formData.languages.map(l => l.toUpperCase()).filter(l => l !== language.toUpperCase()).join('|')}|QUESTION|$)`, 'i')
          const langMatch = block.match(langPattern)
          
          if (langMatch) {
            implementation = langMatch[1].trim()
          } else {
            // Pattern 3: Look for any code block after the hint
            const codeBlockMatch = block.match(/Hint:[\s\S]*?```[\s\S]*?```/i)
            if (codeBlockMatch) {
              implementation = codeBlockMatch[0].replace(/Hint:[\s\S]*?```/i, '').replace(/```/g, '').trim()
            }
          }
        }
        
        // Debug: Log what we found
        console.log(`Language: ${language}, Found implementation: ${implementation ? 'YES' : 'NO'}`)
        if (!implementation) {
          console.log(`Block content for ${language}:`, block.substring(0, 1000))
        }
        
        // Fallback templates if Gemini doesn't generate them
        if (formData.type === 'complete_code' && !implementation) {
          console.log(`Missing template for ${language}, providing fallback`)
          
          const fallbackTemplates = {
            javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
const removeDuplicates = (nums) => {
    // Your code here
};`,
            python: `def remove_duplicates(nums: list[int]) -> int:
    """
    Remove duplicates in-place and return new length
    """
    # Your code here`,
            java: `class Solution {
    /**
     * @param int[] nums
     * @return int
     */
    public int removeDuplicates(int[] nums) {
        // Your code here
    }
}`,
            cpp: `int removeDuplicates(vector<int>& nums) {
    // Your code here
}`,
            csharp: `public class Solution {
    public int RemoveDuplicates(int[] nums) {
        // Your code here
    }
}`,
            go: `func removeDuplicates(nums []int) int {
    // Your code here
    return 0
}`,
            rust: `fn remove_duplicates(nums: &mut Vec<i32>) -> i32 {
    // Your code here
}`,
            typescript: `/**
 * @param {number[]} nums
 * @return {number}
 */
const removeDuplicates = (nums: number[]): number => {
    // Your code here
};`
          }
          
          implementation = fallbackTemplates[language as keyof typeof fallbackTemplates] || `// Function template for ${language}\n// Your code here`
        }

        allQuestions.push({
          ...baseQuestion,
          id: `${baseQuestion.id}-${language}`,
          language: language,
          implementation: implementation
        })
      }

    } catch (parseError) {
      console.error('Error parsing question block:', parseError)
      
      // Add fallback questions for each language
      for (const language of formData.languages) {
        allQuestions.push({
          id: `question-fallback-${i}-${language}`,
          title: `Generated Question ${i + 1}`,
          problemStatement: 'Error parsing question. Please regenerate.',
          inputFormat: '',
          outputFormat: '',
          constraints: '',
          sampleInput: '',
          sampleOutput: '',
          language: language,
          implementation: '',
          hint: ''
        })
      }
    }
  }

  // Ensure we have the right number of questions
  const expectedCount = 5 * formData.languages.length
  while (allQuestions.length < expectedCount) {
    const questionIndex: number = Math.floor(allQuestions.length / formData.languages.length) + 1
    const languageIndex: number = allQuestions.length % formData.languages.length
    const language: string = formData.languages[languageIndex]
    
    allQuestions.push({
      id: `question-fallback-${questionIndex}-${language}`,
      title: `Question ${questionIndex}`,
      problemStatement: 'Question generation incomplete. Please try again.',
      inputFormat: '',
      outputFormat: '',
      constraints: '',
      sampleInput: '',
      sampleOutput: '',
      language: language,
      implementation: '',
      hint: ''
    })
  }

  return allQuestions.slice(0, expectedCount)
}

function generateBaseOnlyPrompt(formData: FormData): string {
  const companyExamples = {
    // Senior Positions
    'Software Engineer': 'Google India, Microsoft India, Amazon India, Adobe India',
    'Full Stack Developer': 'Flipkart, Paytm, Zomato, Swiggy, MakeMyTrip',
    'Backend Python Developer': 'Amazon India, Flipkart, Zomato, Swiggy, Ola',
    'Python Developer': 'TCS, Infosys, Wipro, HCL, Accenture, Tech Mahindra',
    'React.js Developer': 'Flipkart, Swiggy, Zomato, PhonePe, Myntra',
    'Node.js Developer': 'Paytm, Flipkart, Zomato, Swiggy, Ola',
    'DevOps Engineer': 'Amazon India, Microsoft India, Flipkart, Paytm',
    'AWS DevOps Engineer': 'Amazon India, Flipkart, Paytm, Zomato, Swiggy',
    'Cloud Developer': 'Amazon India, Microsoft India, Google India, IBM India',
    'MERN Stack Developer': 'Flipkart, Paytm, Zomato, Swiggy, MakeMyTrip',
    'Java Developer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra, Oracle',
    'Front-end Developer': 'Flipkart, Paytm, Myntra, Zomato, Amazon India',
    'Back-end Developer': 'Amazon India, Flipkart, Google India, Microsoft India',
    'Blockchain Developer': 'WazirX, CoinDCX, Polygon, Zebpay, BitBNS',
    'Salesforce Developer': 'TCS, Infosys, Accenture, Wipro, Deloitte',
    'Software Developer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra',
    
    // Junior/Entry Level Positions
    'Associate Software Engineer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra',
    'Junior Front-End Developer': 'Flipkart, Paytm, Zomato, Swiggy, MakeMyTrip',
    'Junior Back-End Developer': 'Amazon India, Flipkart, Google India, Microsoft India',
    'Full-Stack Developer Intern': 'Flipkart, Paytm, Zomato, Swiggy, Amazon India',
    'Software Developer Trainee': 'TCS, Infosys, Wipro, HCL, Accenture',
    'Mobile App Developer (Trainee)': 'Flipkart, Paytm, Ola, Uber India, MakeMyTrip',
    'Cloud Support Associate': 'Amazon India, Microsoft India, Google India, IBM India',
    'IT Support Engineer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra',
    'QA/Test Engineer': 'TCS, Infosys, Wipro, Amazon India, Flipkart',
    'Technical Support Executive': 'Amazon India, Flipkart, Microsoft India, Google India',
    'Web Developer Intern': 'TCS, Infosys, Wipro, Flipkart, Paytm',
    'Application Support Engineer': 'TCS, Infosys, Wipro, HCL, Accenture',
    'Graduate Engineer Trainee': 'TCS, Infosys, Wipro, HCL, Tech Mahindra'
  }

  const relevantCompanies = companyExamples[formData.positionName as keyof typeof companyExamples] || 'top Indian IT companies'

  const difficultyGuidelines = {
    'easy': 'Basic implementation problems, simple algorithms, straightforward logic. Suitable for 0-2 years experience.',
    'medium': 'Moderate complexity, requires good understanding of data structures and algorithms. Suitable for 2-5 years experience.',
    'hard': 'Complex problems requiring advanced algorithmic thinking and optimization. Suitable for 5+ years experience.'
  }

  return `
You are an expert interviewer from ${relevantCompanies}. Generate exactly 5 high-quality Data Structures and Algorithms questions for ${formData.positionName} position interviews.

CONTEXT:
- Target Companies: ${relevantCompanies}
- Position: ${formData.positionName}
- Topic Focus: ${formData.topic}
- Difficulty: ${formData.difficultyLevel} (${difficultyGuidelines[formData.difficultyLevel as keyof typeof difficultyGuidelines]})
- Question Type: FROM SCRATCH (Problem statements only - NO CODE)
${formData.problem ? `- Additional Context: ${formData.problem}` : ''}
${formData.hint ? `- Hint/Focus: ${formData.hint}` : ''}

FORMAT for each question:

QUESTION [NUMBER]:
Title: [Concise, interview-style title]
Problem Statement: [Clear, detailed problem description that allows candidates to solve from scratch]
Input Format: [Precise input specification]
Output Format: [Clear output specification]
Constraints: [Realistic constraints and complexity expectations]
Sample Input: [Simple test case]
Sample Output: [Correct corresponding output]
Hint: [CRITICAL: Plain English text ONLY! Max 50 words. ABSOLUTELY NO CODE, NO FUNCTION TEMPLATES, NO PROGRAMMING SYNTAX, NO LANGUAGE NAMES. Example: 'Explore dynamic programming or a more efficient approach that avoids brute force enumeration.' DO NOT include JAVA_TEMPLATE, function declarations, or any programming code.]

IMPORTANT: 
- Generate ONLY problem statements
- DO NOT include any code, function templates, or implementations
- Focus on clear problem descriptions that allow candidates to code from scratch
- Include all necessary details for understanding the problem

QUALITY REQUIREMENTS:
1. 🎯 AUTHENTICITY: Real interview patterns from ${relevantCompanies}
2. 🏢 COMPANY RELEVANCE: Match ${formData.positionName} interview style
3. 📊 DIFFICULTY: Appropriate for ${formData.difficultyLevel} level
4. 🔍 TOPIC MASTERY: Focus on ${formData.topic} concepts and patterns
5. 💡 CLARITY: Unambiguous problem statements
6. 🧪 TESTABILITY: Good sample inputs covering typical scenarios
7. ⚡ OPTIMIZATION: Include complexity discussions
8. 🎨 VARIETY: Test different aspects of ${formData.topic}
9. 💡 HINTS: CRITICAL - Generate ONLY plain English text hints (max 50 words). ABSOLUTELY NO CODE, FUNCTION NAMES, PROGRAMMING SYNTAX, or TEMPLATES. Example: 'Use sliding window technique' NOT 'JAVA_TEMPLATE: function()'

Generate 5 distinct, interview-ready questions that a ${formData.positionName} candidate would face at ${relevantCompanies}.
`
}

function parseBaseQuestions(text: string) {
  const questions = []
  const questionBlocks = text.split(/QUESTION \d+:/i).slice(1)

  for (let i = 0; i < questionBlocks.length && i < 5; i++) {
    const block = questionBlocks[i].trim()
    
    try {
      const titleMatch = block.match(/Title:\s*(.+?)(?=\n)/i)
      const problemMatch = block.match(/Problem Statement:\s*([\s\S]+?)(?=Input Format:)/i)
      const inputMatch = block.match(/Input Format:\s*([\s\S]+?)(?=Output Format:)/i)
      const outputMatch = block.match(/Output Format:\s*([\s\S]+?)(?=Constraints:)/i)
      const constraintsMatch = block.match(/Constraints:\s*([\s\S]+?)(?=Sample Input:)/i)
      const sampleInputMatch = block.match(/Sample Input:\s*([\s\S]+?)(?=Sample Output:)/i)
      const sampleOutputMatch = block.match(/Sample Output:\s*([\s\S]+?)(?=Hint:)/i)
      const hintMatch = block.match(/Hint:\s*([\s\S]+?)(?=QUESTION|\n\n|$)/i)

      // Clean hint text - remove any code templates or programming syntax
      const cleanHint = (hintText: string): string => {
        if (!hintText) return ''
        
        // Remove any code blocks, function templates, and programming syntax
        let cleaned = hintText
          .replace(/```[\s\S]*?```/g, '') // Remove code blocks
          .replace(/JAVA_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove JAVA_TEMPLATE
          .replace(/PYTHON_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove PYTHON_TEMPLATE  
          .replace(/JAVASCRIPT_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove JAVASCRIPT_TEMPLATE
          .replace(/CPP_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove CPP_TEMPLATE
          .replace(/CSHARP_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove CSHARP_TEMPLATE
          .replace(/GO_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove GO_TEMPLATE
          .replace(/RUST_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove RUST_TEMPLATE
          .replace(/TYPESCRIPT_TEMPLATE:[\s\S]*?(?=\n\n|$)/gi, '') // Remove TYPESCRIPT_TEMPLATE
          .replace(/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
          .replace(/\/\/.*$/gm, '') // Remove // comments
          .replace(/\{[\s\S]*?\}/g, '') // Remove { } blocks
          .replace(/\([\s\S]*?\)/g, '') // Remove function parentheses
          .replace(/class\s+\w+[\s\S]*?(?=\n\n|$)/gi, '') // Remove class definitions
          .replace(/function\s+\w+[\s\S]*?(?=\n\n|$)/gi, '') // Remove function definitions
          .replace(/def\s+\w+[\s\S]*?(?=\n\n|$)/gi, '') // Remove Python function definitions
          .replace(/public\s+.*?(?=\n\n|$)/gi, '') // Remove public methods
          .replace(/private\s+.*?(?=\n\n|$)/gi, '') // Remove private methods
          .trim()
        
        // Take only the first line/sentence if it's clean text
        const firstSentence = cleaned.split(/[.!?]\s+/)[0]
        if (firstSentence && firstSentence.length > 10 && firstSentence.length < 200 && !firstSentence.includes('{') && !firstSentence.includes('(')) {
          return firstSentence
        }
        
        return cleaned.slice(0, 200).trim() // Limit to 200 chars max
      }

      const question = {
        id: `question-${Date.now()}-${i}`,
        title: titleMatch?.[1]?.trim() || `Question ${i + 1}`,
        problemStatement: problemMatch?.[1]?.trim() || 'Problem statement not found',
        inputFormat: inputMatch?.[1]?.trim() || 'Input format not specified',
        outputFormat: outputMatch?.[1]?.trim() || 'Output format not specified',
        constraints: constraintsMatch?.[1]?.trim() || 'Constraints not specified',
        sampleInput: sampleInputMatch?.[1]?.trim() || 'Sample input not provided',
        sampleOutput: sampleOutputMatch?.[1]?.trim() || 'Sample output not provided',
        hint: cleanHint(hintMatch?.[1]?.trim() || '')
      }

      questions.push(question)
    } catch (parseError) {
      console.error('Error parsing question block:', parseError)
      questions.push({
        id: `question-${Date.now()}-${i}`,
        title: `Generated Question ${i + 1}`,
        problemStatement: 'Error parsing question. Please regenerate.',
        inputFormat: '',
        outputFormat: '',
        constraints: '',
        sampleInput: '',
        sampleOutput: ''
      })
    }
  }

  // Ensure we always return 5 questions
  while (questions.length < 5) {
    questions.push({
      id: `question-fallback-${questions.length}`,
      title: `Question ${questions.length + 1}`,
      problemStatement: 'Question generation incomplete. Please try again.',
      inputFormat: '',
      outputFormat: '',
      constraints: '',
      sampleInput: '',
      sampleOutput: ''
    })
  }

  return questions.slice(0, 5)
} 