'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Send, RefreshCw, CheckCircle2, FileSpreadsheet } from 'lucide-react'

interface Question {
  id: string
  title: string
  problemStatement: string
  inputFormat: string
  outputFormat: string
  constraints: string
  sampleInput: string
  sampleOutput: string
  functionTemplate?: string
}

interface FormData {
  positionName: string
  language: string
  problem: string
  hint: string
  type: 'from-scratch' | 'complete-code'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  topic: string
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    positionName: 'Software Engineer',
    language: 'javascript',
    problem: '',
    hint: '',
    type: 'from-scratch',
    difficultyLevel: 'medium',
    topic: 'Arrays'
  })

  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSendingToSheet, setIsSendingToSheet] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateQuestions = async () => {

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to generate questions')
      }

      const data = await response.json()
      setQuestions(data.questions)
      setSelectedQuestions(new Set())
      toast.success('Questions generated successfully!')
    } catch (error) {
      toast.error('Error generating questions. Please try again.')
      console.error('Error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const sendToSheet = async () => {
    if (selectedQuestions.size === 0) {
      toast.error('Please select at least one question')
      return
    }

    setIsSendingToSheet(true)
    try {
      const selectedQuestionsData = questions.filter(q => selectedQuestions.has(q.id))
      
      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          questions: selectedQuestionsData,
          inputParameters: formData
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send to sheet')
      }

      toast.success('Questions sent to Google Sheet successfully!')
      setSelectedQuestions(new Set())
    } catch (error) {
      toast.error('Error sending to sheet. Please try again.')
      console.error('Error:', error)
    } finally {
      setIsSendingToSheet(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">DSA Question Generator</h1>
          <p className="text-lg text-gray-600">Generate Data Structures and Algorithms questions using AI</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Question Parameters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label htmlFor="positionName" className="block text-sm font-medium text-gray-700 mb-2">
                Position Name
              </label>
              <select
                id="positionName"
                name="positionName"
                value={formData.positionName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Software Engineer">Software Engineer</option>
                <option value="Full Stack Developer">Full Stack Developer</option>
                <option value="Software Development Engineer">Software Development Engineer</option>
                <option value="Front-End Developer">Front-End Developer</option>
                <option value="Python Developer">Python Developer</option>
                <option value="React JS Developer">React JS Developer</option>
                <option value="Web Developer">Web Developer</option>
                <option value="Java Developer">Java Developer</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="DevOps Engineer">DevOps Engineer</option>
              </select>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="from-scratch">From Scratch</option>
                <option value="complete-code">Complete the Code</option>
              </select>
            </div>

            {formData.type === 'complete-code' && (
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="csharp">C#</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="difficultyLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                id="difficultyLevel"
                name="difficultyLevel"
                value={formData.difficultyLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                Topic
              </label>
              <select
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Arrays">Arrays</option>
                <option value="Strings">Strings</option>
                <option value="Linked Lists">Linked Lists</option>
                <option value="Stacks">Stacks</option>
                <option value="Queues">Queues</option>
                <option value="Trees">Trees</option>
                <option value="Binary Trees">Binary Trees</option>
                <option value="Binary Search Trees">Binary Search Trees</option>
                <option value="Heaps">Heaps</option>
                <option value="Graphs">Graphs</option>
                <option value="Hash Tables">Hash Tables</option>
                <option value="Dynamic Programming">Dynamic Programming</option>
                <option value="Recursion">Recursion</option>
                <option value="Backtracking">Backtracking</option>
                <option value="Greedy Algorithms">Greedy Algorithms</option>
                <option value="Sorting Algorithms">Sorting Algorithms</option>
                <option value="Searching Algorithms">Searching Algorithms</option>
                <option value="Two Pointers">Two Pointers</option>
                <option value="Sliding Window">Sliding Window</option>
                <option value="Binary Search">Binary Search</option>
                <option value="Depth First Search">Depth First Search</option>
                <option value="Breadth First Search">Breadth First Search</option>
                <option value="Trie">Trie</option>
                <option value="Union Find">Union Find</option>
                <option value="Segment Trees">Segment Trees</option>
                <option value="Fenwick Tree">Fenwick Tree</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg mb-4 border border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-blue-800 font-medium">🇮🇳 Indian IT Company Focus</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Questions are specifically designed based on real interviews from top Indian IT companies like TCS, Infosys, Wipro, Amazon India, Microsoft India, Google India, Flipkart, and more.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    <strong>✨ Features:</strong> AI-generated titles • Accurate sample outputs • Real interview questions
                  </p>
                </div>
              </div>
            </div>

            <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-2">
              Problem Description (Optional)
            </label>
            <textarea
              id="problem"
              name="problem"
              value={formData.problem}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Specific problem requirements or context"
            />
          </div>

          <div className="mt-6">
            <label htmlFor="hint" className="block text-sm font-medium text-gray-700 mb-2">
              Hint (Optional)
            </label>
            <textarea
              id="hint"
              name="hint"
              value={formData.hint}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any hints or additional context"
            />
          </div>

          <div className="mt-6">
            <button
              onClick={generateQuestions}
              disabled={isGenerating}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin -ml-1 mr-3 h-5 w-5" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="-ml-1 mr-3 h-5 w-5" />
                  Generate 5 Questions
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Questions */}
        {questions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Generated Questions</h2>
              <button
                onClick={sendToSheet}
                disabled={isSendingToSheet || selectedQuestions.size === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingToSheet ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="-ml-1 mr-2 h-4 w-4" />
                    Send to Sheet ({selectedQuestions.size})
                  </>
                )}
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((question) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">{question.title}</h3>
                    <button
                      onClick={() => toggleQuestionSelection(question.id)}
                      className={`ml-4 p-2 rounded-full ${
                        selectedQuestions.has(question.id)
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-700">Problem Statement:</h4>
                      <p className="text-gray-600 mt-1">{question.problemStatement}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-700">Input Format:</h4>
                        <p className="text-gray-600 mt-1">{question.inputFormat}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Output Format:</h4>
                        <p className="text-gray-600 mt-1">{question.outputFormat}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700">Constraints:</h4>
                      <p className="text-gray-600 mt-1">{question.constraints}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-700">Sample Input:</h4>
                        <pre className="bg-gray-50 p-2 rounded mt-1 text-xs">{question.sampleInput}</pre>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Sample Output:</h4>
                        <pre className="bg-gray-50 p-2 rounded mt-1 text-xs">{question.sampleOutput}</pre>
                      </div>
                    </div>

                    {question.functionTemplate && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-700">Function Template:</h4>
                        <pre className="bg-blue-50 p-3 rounded mt-1 text-sm border border-blue-200 overflow-x-auto">{question.functionTemplate}</pre>
                        <p className="text-xs text-blue-600 mt-1">Complete the function above to solve the problem</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 