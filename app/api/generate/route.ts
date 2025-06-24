import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface FormData {
  positionName: string
  language: string
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

    const prompt = generatePrompt(formData)

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse the response to extract questions with AI-verified outputs
    const questions = parseQuestionsFromResponse(text)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error generating questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}

function generatePrompt(formData: FormData): string {
  const displayLanguage = formData.type === 'complete-code' ? formData.language : 'python'
  
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

  const topicFocus = {
    'Arrays': 'array manipulation, searching, sorting, two pointers, sliding window',
    'Strings': 'string manipulation, pattern matching, palindromes, anagrams',
    'Linked Lists': 'traversal, reversal, cycle detection, merging',
    'Stacks': 'bracket matching, expression evaluation, next greater element',
    'Queues': 'BFS implementation, sliding window maximum, circular queue',
    'Trees': 'traversals, height calculation, path problems, validation',
    'Binary Trees': 'level order, diameter, lowest common ancestor, views',
    'Binary Search Trees': 'search, insertion, deletion, validation',
    'Heaps': 'k largest/smallest, merge k sorted, priority queue',
    'Graphs': 'BFS, DFS, shortest path, connectivity, cycle detection',
    'Hash Tables': 'frequency counting, two sum variants, grouping',
    'Dynamic Programming': 'memoization, tabulation, optimization problems',
    'Recursion': 'divide and conquer, backtracking, tree recursion',
    'Backtracking': 'permutations, combinations, n-queens, sudoku',
    'Greedy Algorithms': 'activity selection, fractional knapsack, intervals',
    'Sorting Algorithms': 'implementation, comparison, stability analysis',
    'Searching Algorithms': 'binary search variants, search in rotated array',
    'Two Pointers': 'opposite direction, same direction, fast-slow',
    'Sliding Window': 'fixed size, variable size, maximum/minimum',
    'Binary Search': 'search space reduction, bounds finding',
    'Depth First Search': 'connected components, path finding, topological sort',
    'Breadth First Search': 'shortest path, level order, minimum steps',
    'Trie': 'prefix operations, word search, autocomplete',
    'Union Find': 'disjoint sets, connectivity, cycle detection',
    'Segment Trees': 'range queries, range updates, lazy propagation',
    'Fenwick Tree': 'prefix sums, range sum queries, point updates'
  }

  const basePrompt = `
You are an expert interviewer from ${relevantCompanies}. Generate exactly 5 high-quality Data Structures and Algorithms questions for ${formData.positionName} position interviews.

CONTEXT:
- Target Companies: ${relevantCompanies}
- Position: ${formData.positionName}
- Topic Focus: ${formData.topic} (${topicFocus[formData.topic as keyof typeof topicFocus] || 'core concepts'})
- Difficulty: ${formData.difficultyLevel} (${difficultyGuidelines[formData.difficultyLevel as keyof typeof difficultyGuidelines]})
- Question Type: ${formData.type === 'from-scratch' ? 'Problem Solving from Scratch' : 'Complete the Function'}
${formData.problem ? `- Additional Context: ${formData.problem}` : ''}
${formData.hint ? `- Hint/Focus: ${formData.hint}` : ''}

FORMAT for each question:

QUESTION [NUMBER]:
Title: [Concise, interview-style title that reflects real ${formData.topic} problems]
Problem Statement: [Clear, detailed problem description as asked in actual interviews. Include edge cases and clarifications.]
Input Format: [Precise input specification with data types and constraints]
Output Format: [Clear output specification with examples]
Constraints: [Realistic time/space complexity expectations and input limits]
Sample Input: [Simple, clear test case that demonstrates the problem]
Sample Output: [Correct corresponding output]${formData.type === 'complete-code' ? `
Function Template:
\`\`\`${displayLanguage}
[Generate ONLY a minimal function skeleton specific to this problem with meaningful parameter names and appropriate data types in ${displayLanguage}. Follow LeetCode style conventions.

CRITICAL: Generate ONLY the function signature with a comment placeholder - DO NOT include any implementation code, logic, or solution.

Format examples:
- JavaScript: function twoSum(nums, target) {\n    // Your code here\n    return result;\n}
- Python: def two_sum(nums: List[int], target: int) -> List[int]:\n    # Your code here\n    return result
- Java: public int[] twoSum(int[] nums, int target) {\n    // Your code here\n    return result;\n}
- C++: vector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n    return result;\n}

Keep it minimal: function definition line + comment + return statement (if applicable) + closing brace.]
\`\`\`` : ''}

QUALITY REQUIREMENTS:
1. 🎯 AUTHENTICITY: Base each question on real interview patterns from ${relevantCompanies}
2. 🏢 COMPANY RELEVANCE: Match the style and difficulty of actual ${formData.positionName} interviews
3. 📊 DIFFICULTY CALIBRATION: Ensure ${formData.difficultyLevel} level is appropriate for the target experience
4. 🔍 TOPIC MASTERY: Focus deeply on ${formData.topic} - test core concepts, common patterns, and edge cases
5. 💡 CLARITY: Problem statements should be unambiguous and interview-ready
6. 🧪 TESTABILITY: Sample inputs should cover typical scenarios and edge cases
7. ⚡ OPTIMIZATION: Include time/space complexity discussions relevant to interviews
8. 🎨 VARIETY: Each question should test different aspects of ${formData.topic}${formData.type === 'complete-code' ? `
9. 🔧 FUNCTION DESIGN: Create meaningful function signatures with proper parameter names that reflect the problem domain` : ''}

SPECIFIC GUIDELINES:
- Make problems practical and relatable (e.g., real-world scenarios)
- Include proper input validation considerations
- Ensure sample inputs are neither trivial nor overly complex
- Test boundary conditions and edge cases
- Focus on patterns commonly tested in Indian tech interviews
- Balance theoretical knowledge with practical implementation${formData.type === 'complete-code' ? `
- Design function templates with descriptive parameter names (e.g., 'nums', 'target', 'root', 'graph', 'k', 'matrix')
- Use appropriate data types for the language (List[int] for Python, int[] for Java, vector<int> for C++)
- Follow standard naming conventions for each language
- Make function names descriptive and problem-specific` : ''}

Generate 5 distinct, interview-ready questions that a ${formData.positionName} candidate would face at ${relevantCompanies}.
`

  return basePrompt
}

function getFunctionTemplate(language: string, topic: string): string {
  // Enhanced templates with more topic-specific variations
  const templates = {
    'javascript': {
      'Arrays': 'function solveProblem(nums) {\n    // Your code here\n    return result;\n}',
      'Strings': 'function solveProblem(s) {\n    // Your code here\n    return result;\n}',
      'Linked Lists': 'function solveProblem(head) {\n    // Your code here\n    return result;\n}',
      'Trees': 'function solveProblem(root) {\n    // Your code here\n    return result;\n}',
      'Binary Trees': 'function solveProblem(root) {\n    // Your code here\n    return result;\n}',
      'Binary Search Trees': 'function solveProblem(root) {\n    // Your code here\n    return result;\n}',
      'Graphs': 'function solveProblem(graph) {\n    // Your code here\n    return result;\n}',
      'Hash Tables': 'function solveProblem(nums) {\n    // Your code here\n    return result;\n}',
      'Dynamic Programming': 'function solveProblem(n) {\n    // Your code here\n    return result;\n}',
      'Two Pointers': 'function solveProblem(nums, target) {\n    // Your code here\n    return result;\n}',
      'Sliding Window': 'function solveProblem(s, k) {\n    // Your code here\n    return result;\n}',
      'Binary Search': 'function solveProblem(nums, target) {\n    // Your code here\n    return result;\n}',
      'Backtracking': 'function solveProblem(nums) {\n    // Your code here\n    return result;\n}',
      'Heaps': 'function solveProblem(nums, k) {\n    // Your code here\n    return result;\n}',
      'Stacks': 'function solveProblem(s) {\n    // Your code here\n    return result;\n}',
      'Queues': 'function solveProblem(nums) {\n    // Your code here\n    return result;\n}',
      'default': 'function solveProblem(input) {\n    // Your code here\n    return result;\n}'
    },
    'python': {
      'Arrays': 'def solve_problem(nums: List[int]) -> List[int]:\n    # Your code here\n    return result',
      'Strings': 'def solve_problem(s: str) -> str:\n    # Your code here\n    return result',
      'Linked Lists': 'def solve_problem(head: ListNode) -> ListNode:\n    # Your code here\n    return result',
      'Trees': 'def solve_problem(root: TreeNode) -> int:\n    # Your code here\n    return result',
      'Binary Trees': 'def solve_problem(root: TreeNode) -> int:\n    # Your code here\n    return result',
      'Binary Search Trees': 'def solve_problem(root: TreeNode) -> bool:\n    # Your code here\n    return result',
      'Graphs': 'def solve_problem(graph: List[List[int]]) -> List[int]:\n    # Your code here\n    return result',
      'Hash Tables': 'def solve_problem(nums: List[int]) -> List[int]:\n    # Your code here\n    return result',
      'Dynamic Programming': 'def solve_problem(n: int) -> int:\n    # Your code here\n    return result',
      'Two Pointers': 'def solve_problem(nums: List[int], target: int) -> List[int]:\n    # Your code here\n    return result',
      'Sliding Window': 'def solve_problem(s: str, k: int) -> int:\n    # Your code here\n    return result',
      'Binary Search': 'def solve_problem(nums: List[int], target: int) -> int:\n    # Your code here\n    return result',
      'Backtracking': 'def solve_problem(nums: List[int]) -> List[List[int]]:\n    # Your code here\n    return result',
      'Heaps': 'def solve_problem(nums: List[int], k: int) -> List[int]:\n    # Your code here\n    return result',
      'Stacks': 'def solve_problem(s: str) -> bool:\n    # Your code here\n    return result',
      'Queues': 'def solve_problem(nums: List[int]) -> List[int]:\n    # Your code here\n    return result',
      'default': 'def solve_problem(input_data) -> Any:\n    # Your code here\n    return result'
    },
    'java': {
      'Arrays': 'public int[] solveProblem(int[] nums) {\n    // Your code here\n    return result;\n}',
      'Strings': 'public String solveProblem(String s) {\n    // Your code here\n    return result;\n}',
      'Linked Lists': 'public ListNode solveProblem(ListNode head) {\n    // Your code here\n    return result;\n}',
      'Trees': 'public int solveProblem(TreeNode root) {\n    // Your code here\n    return result;\n}',
      'Binary Trees': 'public int solveProblem(TreeNode root) {\n    // Your code here\n    return result;\n}',
      'Binary Search Trees': 'public boolean solveProblem(TreeNode root) {\n    // Your code here\n    return result;\n}',
      'Graphs': 'public List<Integer> solveProblem(int[][] graph) {\n    // Your code here\n    return result;\n}',
      'Hash Tables': 'public int[] solveProblem(int[] nums) {\n    // Your code here\n    return result;\n}',
      'Dynamic Programming': 'public int solveProblem(int n) {\n    // Your code here\n    return result;\n}',
      'Two Pointers': 'public int[] solveProblem(int[] nums, int target) {\n    // Your code here\n    return result;\n}',
      'Sliding Window': 'public int solveProblem(String s, int k) {\n    // Your code here\n    return result;\n}',
      'Binary Search': 'public int solveProblem(int[] nums, int target) {\n    // Your code here\n    return result;\n}',
      'Backtracking': 'public List<List<Integer>> solveProblem(int[] nums) {\n    // Your code here\n    return result;\n}',
      'Heaps': 'public int[] solveProblem(int[] nums, int k) {\n    // Your code here\n    return result;\n}',
      'Stacks': 'public boolean solveProblem(String s) {\n    // Your code here\n    return result;\n}',
      'Queues': 'public int[] solveProblem(int[] nums) {\n    // Your code here\n    return result;\n}',
      'default': 'public Object solveProblem(Object input) {\n    // Your code here\n    return result;\n}'
    },
    'cpp': {
      'Arrays': 'vector<int> solveProblem(vector<int>& nums) {\n    // Your code here\n    return result;\n}',
      'Strings': 'string solveProblem(string s) {\n    // Your code here\n    return result;\n}',
      'Linked Lists': 'ListNode* solveProblem(ListNode* head) {\n    // Your code here\n    return result;\n}',
      'Trees': 'int solveProblem(TreeNode* root) {\n    // Your code here\n    return result;\n}',
      'Binary Trees': 'int solveProblem(TreeNode* root) {\n    // Your code here\n    return result;\n}',
      'Binary Search Trees': 'bool solveProblem(TreeNode* root) {\n    // Your code here\n    return result;\n}',
      'Graphs': 'vector<int> solveProblem(vector<vector<int>>& graph) {\n    // Your code here\n    return result;\n}',
      'Hash Tables': 'vector<int> solveProblem(vector<int>& nums) {\n    // Your code here\n    return result;\n}',
      'Dynamic Programming': 'int solveProblem(int n) {\n    // Your code here\n    return result;\n}',
      'Two Pointers': 'vector<int> solveProblem(vector<int>& nums, int target) {\n    // Your code here\n    return result;\n}',
      'Sliding Window': 'int solveProblem(string s, int k) {\n    // Your code here\n    return result;\n}',
      'Binary Search': 'int solveProblem(vector<int>& nums, int target) {\n    // Your code here\n    return result;\n}',
      'Backtracking': 'vector<vector<int>> solveProblem(vector<int>& nums) {\n    // Your code here\n    return result;\n}',
      'Heaps': 'vector<int> solveProblem(vector<int>& nums, int k) {\n    // Your code here\n    return result;\n}',
      'Stacks': 'bool solveProblem(string s) {\n    // Your code here\n    return result;\n}',
      'Queues': 'vector<int> solveProblem(vector<int>& nums) {\n    // Your code here\n    return result;\n}',
      'default': 'auto solveProblem(auto input) {\n    // Your code here\n    return result;\n}'
    },
    'csharp': {
      'Arrays': 'public int[] SolveProblem(int[] nums) {\n    // Your code here\n    return result;\n}',
      'Strings': 'public string SolveProblem(string s) {\n    // Your code here\n    return result;\n}',
      'Linked Lists': 'public ListNode SolveProblem(ListNode head) {\n    // Your code here\n    return result;\n}',
      'Trees': 'public int SolveProblem(TreeNode root) {\n    // Your code here\n    return result;\n}',
      'Binary Trees': 'public int SolveProblem(TreeNode root) {\n    // Your code here\n    return result;\n}',
      'Binary Search Trees': 'public bool SolveProblem(TreeNode root) {\n    // Your code here\n    return result;\n}',
      'Graphs': 'public List<int> SolveProblem(int[,] graph) {\n    // Your code here\n    return result;\n}',
      'Hash Tables': 'public int[] SolveProblem(int[] nums) {\n    // Your code here\n    return result;\n}',
      'Dynamic Programming': 'public int SolveProblem(int n) {\n    // Your code here\n    return result;\n}',
      'Two Pointers': 'public int[] SolveProblem(int[] nums, int target) {\n    // Your code here\n    return result;\n}',
      'Sliding Window': 'public int SolveProblem(string s, int k) {\n    // Your code here\n    return result;\n}',
      'Binary Search': 'public int SolveProblem(int[] nums, int target) {\n    // Your code here\n    return result;\n}',
      'Backtracking': 'public List<List<int>> SolveProblem(int[] nums) {\n    // Your code here\n    return result;\n}',
      'Heaps': 'public int[] SolveProblem(int[] nums, int k) {\n    // Your code here\n    return result;\n}',
      'Stacks': 'public bool SolveProblem(string s) {\n    // Your code here\n    return result;\n}',
      'Queues': 'public int[] SolveProblem(int[] nums) {\n    // Your code here\n    return result;\n}',
      'default': 'public object SolveProblem(object input) {\n    // Your code here\n    return result;\n}'
    }
  }

  const langTemplates = templates[language as keyof typeof templates] || templates['python']
  return langTemplates[topic as keyof typeof langTemplates] || langTemplates['default']
}

function parseQuestionsFromResponse(text: string) {
  const questions = []
  const questionBlocks = text.split(/QUESTION \d+:/i).slice(1)

  for (let i = 0; i < questionBlocks.length && i < 5; i++) {
    const block = questionBlocks[i].trim()
    
    try {
      const titleMatch = block.match(/Title:\s*(.+?)(?=\n|Problem Statement:)/i)
      const problemMatch = block.match(/Problem Statement:\s*([\s\S]+?)(?=Input Format:)/i)
      const inputMatch = block.match(/Input Format:\s*([\s\S]+?)(?=Output Format:)/i)
      const outputMatch = block.match(/Output Format:\s*([\s\S]+?)(?=Constraints:)/i)
      const constraintsMatch = block.match(/Constraints:\s*([\s\S]+?)(?=Sample Input:)/i)
      const sampleInputMatch = block.match(/Sample Input:\s*([\s\S]+?)(?=Sample Output:)/i)
      const sampleOutputMatch = block.match(/Sample Output:\s*([\s\S]+?)(?=Function Template:|QUESTION|\n\n|$)/i)
      const functionTemplateMatch = block.match(/Function Template:\s*```[\s\S]*?\n([\s\S]+?)```/i)

      const question = {
        id: `question-${Date.now()}-${i}`,
        title: titleMatch?.[1]?.trim() || `Question ${i + 1}`,
        problemStatement: problemMatch?.[1]?.trim() || 'Problem statement not found',
        inputFormat: inputMatch?.[1]?.trim() || 'Input format not specified',
        outputFormat: outputMatch?.[1]?.trim() || 'Output format not specified',
        constraints: constraintsMatch?.[1]?.trim() || 'Constraints not specified',
        sampleInput: sampleInputMatch?.[1]?.trim() || 'Sample input not provided',
        sampleOutput: sampleOutputMatch?.[1]?.trim() || 'Sample output not provided',
        functionTemplate: functionTemplateMatch?.[1]?.trim() || ''
      }

      questions.push(question)
    } catch (parseError) {
      console.error('Error parsing question block:', parseError)
      // Add a fallback question
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