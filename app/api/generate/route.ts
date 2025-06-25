import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface FormData {
  positionName: string
  languages: string[]
  problem: string
  hint: string
  type: 'from-scratch' | 'complete-code'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  topic: string
}

export async function POST(request: NextRequest) {
  try {
    const formData: FormData = await request.json()

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    if (formData.type === 'from-scratch') {
      // For from-scratch, generate only problem statements (no code)
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
      // For complete-code, generate with function templates
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
    'Software Engineer': 'Google India, Microsoft India, Amazon India',
    'Full Stack Developer': 'Flipkart, Paytm, Zomato, Swiggy, MakeMyTrip',
    'Software Development Engineer': 'Amazon India, Microsoft India, Adobe India',
    'Front-End Developer': 'Flipkart, Paytm, Myntra, Zomato',
    'Python Developer': 'TCS, Infosys, Wipro, HCL, Accenture',
    'React JS Developer': 'Flipkart, Swiggy, Zomato, PhonePe',
    'Web Developer': 'TCS, Infosys, Capgemini, Cognizant',
    'Java Developer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra',
    'Data Scientist': 'Flipkart, Amazon India, Microsoft India, Mu Sigma',
    'DevOps Engineer': 'Amazon India, Microsoft India, Flipkart, Paytm'
  }

  const relevantCompanies = companyExamples[formData.positionName as keyof typeof companyExamples] || 'top Indian IT companies'

  const difficultyGuidelines = {
    'easy': 'Basic implementation problems, simple algorithms, straightforward logic. Suitable for 0-2 years experience.',
    'medium': 'Moderate complexity, requires good understanding of data structures and algorithms. Suitable for 2-5 years experience.',
    'hard': 'Complex problems requiring advanced algorithmic thinking and optimization. Suitable for 5+ years experience.'
  }

  const languageList = formData.languages.join(', ')
  const isFromScratch = formData.type === 'from-scratch'

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
Input Format: [Precise input specification]
Output Format: [Clear output specification]
Constraints: [Realistic constraints and complexity expectations]
Sample Input: [Simple test case]
Sample Output: [Correct corresponding output]

${isFromScratch ? `COMPLETE IMPLEMENTATIONS:` : `FUNCTION TEMPLATES:`}
${formData.languages.map(lang => {
  if (isFromScratch) {
    return `${lang.toUpperCase()}_IMPLEMENTATION: [Complete working solution in ${lang} with proper input/output handling, comments, and full logic]`
  } else {
    return `${lang.toUpperCase()}_TEMPLATE: [Function skeleton only - signature with "// Your code here" comment, no solution logic]`
  }
}).join('\n')}

${isFromScratch ? `
IMPLEMENTATION REQUIREMENTS:
- Generate complete, runnable solutions
- Include proper input/output handling  
- Add comments explaining the approach
- Follow language best practices
- Handle edge cases mentioned in constraints
- Include main function or entry point if needed
` : `
TEMPLATE REQUIREMENTS:
- Generate ONLY function signatures with meaningful parameter names
- Include appropriate data types for each language
- Add only "// Your code here" comment in function body
- Include return statement placeholder if applicable
- DO NOT include any solution logic, implementation, or algorithm
- Keep minimal - just empty function shells
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
      const sampleOutputMatch = block.match(/Sample Output:\s*([\s\S]+?)(?=(?:COMPLETE IMPLEMENTATIONS:|FUNCTION TEMPLATES:))/i)

      const baseQuestion = {
        id: `question-${Date.now()}-${i}`,
        title: titleMatch?.[1]?.trim() || `Question ${i + 1}`,
        problemStatement: problemMatch?.[1]?.trim() || 'Problem statement not found',
        inputFormat: inputMatch?.[1]?.trim() || 'Input format not specified',
        outputFormat: outputMatch?.[1]?.trim() || 'Output format not specified',
        constraints: constraintsMatch?.[1]?.trim() || 'Constraints not specified',
        sampleInput: sampleInputMatch?.[1]?.trim() || 'Sample input not provided',
        sampleOutput: sampleOutputMatch?.[1]?.trim() || 'Sample output not provided'
      }

      // Extract implementations for each language
      for (const language of formData.languages) {
        const langKey = formData.type === 'from-scratch' 
          ? `${language.toUpperCase()}_IMPLEMENTATION:` 
          : `${language.toUpperCase()}_TEMPLATE:`
        
        const implementationMatch = block.match(new RegExp(`${langKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([\\s\\S]+?)(?=${formData.languages.map(l => 
          formData.type === 'from-scratch' 
            ? `${l.toUpperCase()}_IMPLEMENTATION:` 
            : `${l.toUpperCase()}_TEMPLATE:`
        ).filter(k => k !== langKey).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|QUESTION|$)`, 'i'))

        const implementation = implementationMatch?.[1]?.trim() || ''

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
          implementation: ''
        })
      }
    }
  }

  // Ensure we have the right number of questions
  const expectedCount = 5 * formData.languages.length
  while (allQuestions.length < expectedCount) {
    const questionIndex = Math.floor(allQuestions.length / formData.languages.length) + 1
    const languageIndex = allQuestions.length % formData.languages.length
    const language = formData.languages[languageIndex]
    
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
      implementation: ''
    })
  }

  return allQuestions.slice(0, expectedCount)
}

function generateBaseOnlyPrompt(formData: FormData): string {
  const companyExamples = {
    'Software Engineer': 'Google India, Microsoft India, Amazon India',
    'Full Stack Developer': 'Flipkart, Paytm, Zomato, Swiggy, MakeMyTrip',
    'Software Development Engineer': 'Amazon India, Microsoft India, Adobe India',
    'Front-End Developer': 'Flipkart, Paytm, Myntra, Zomato',
    'Python Developer': 'TCS, Infosys, Wipro, HCL, Accenture',
    'React JS Developer': 'Flipkart, Swiggy, Zomato, PhonePe',
    'Web Developer': 'TCS, Infosys, Capgemini, Cognizant',
    'Java Developer': 'TCS, Infosys, Wipro, HCL, Tech Mahindra',
    'Data Scientist': 'Flipkart, Amazon India, Microsoft India, Mu Sigma',
    'DevOps Engineer': 'Amazon India, Microsoft India, Flipkart, Paytm'
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
      const sampleOutputMatch = block.match(/Sample Output:\s*([\s\S]+?)(?=QUESTION|\n\n|$)/i)

      const question = {
        id: `question-${Date.now()}-${i}`,
        title: titleMatch?.[1]?.trim() || `Question ${i + 1}`,
        problemStatement: problemMatch?.[1]?.trim() || 'Problem statement not found',
        inputFormat: inputMatch?.[1]?.trim() || 'Input format not specified',
        outputFormat: outputMatch?.[1]?.trim() || 'Output format not specified',
        constraints: constraintsMatch?.[1]?.trim() || 'Constraints not specified',
        sampleInput: sampleInputMatch?.[1]?.trim() || 'Sample input not provided',
        sampleOutput: sampleOutputMatch?.[1]?.trim() || 'Sample output not provided'
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