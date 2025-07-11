'use client'

import { useState, useEffect, useRef } from 'react'
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
  language?: string
  implementation?: string
  hint?: string
}

interface FormData {
  positionName: string
  languages: string[]
  problem: string
  hint: string
  type: 'complete_code' | 'write_code'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  topic: string
}

export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    positionName: 'Software Engineer',
    languages: ['javascript'],
    problem: '',
    hint: '',
    type: 'complete_code',
    difficultyLevel: 'medium',
    topic: 'Arrays'
  })

  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSendingToSheet, setIsSendingToSheet] = useState(false)
  const [positionSearch, setPositionSearch] = useState('')
  const [showPositionDropdown, setShowPositionDropdown] = useState(false)
  const positionDropdownRef = useRef<HTMLDivElement>(null)

  const availablePositions = [
    // Senior Positions
    'Software Engineer',
    'Full Stack Developer',
    'Backend Python Developer',
    'Python Developer',
    'React.js Developer',
    'Node.js Developer',
    'DevOps Engineer',
    'AWS DevOps Engineer',
    'Cloud Developer',
    'MERN Stack Developer',
    'Java Developer',
    'Front-end Developer',
    'Back-end Developer',
    'Blockchain Developer',
    'Salesforce Developer',
    'Software Developer',
    
    // Junior/Entry Level Positions
    'Associate Software Engineer',
    'Junior Front-End Developer',
    'Junior Back-End Developer',
    'Full-Stack Developer Intern',
    'Software Developer Trainee',
    'Mobile App Developer (Trainee)',
    'Cloud Support Associate',
    'IT Support Engineer',
    'QA/Test Engineer',
    'Technical Support Executive',
    'Web Developer Intern',
    'Application Support Engineer',
    'Graduate Engineer Trainee'
  ]

  const availableLanguages = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'cpp', name: 'C++' },
    { id: 'csharp', name: 'C#' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' },
    { id: 'typescript', name: 'TypeScript' }
  ]

  const filteredPositions = availablePositions.filter(position =>
    position.toLowerCase().includes(positionSearch.toLowerCase())
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLanguageChange = (languageId: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(languageId)
        ? prev.languages.filter(lang => lang !== languageId)
        : [...prev.languages, languageId]
    }))
  }

  const handleSelectAllLanguages = () => {
    const allLanguageIds = availableLanguages.map(lang => lang.id)
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.length === allLanguageIds.length ? [] : allLanguageIds
    }))
  }

  const handlePositionSelect = (position: string) => {
    setFormData(prev => ({
      ...prev,
      positionName: position
    }))
    setPositionSearch(position)
    setShowPositionDropdown(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (positionDropdownRef.current && !positionDropdownRef.current.contains(event.target as Node)) {
        setShowPositionDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const generateQuestions = async () => {
    if (formData.languages.length === 0) {
      toast.error('Please select at least one language')
      return
    }

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

  // Function to get question number for display
  const getQuestionNumber = (questionId: string) => {
    // Group questions by their base question (same problem, different languages)
    const questionGroups = new Map()
    questions.forEach(question => {
      // Extract base question ID (remove language suffix)
      const baseId = question.id.replace(/-[^-]+$/, '')
      if (!questionGroups.has(baseId)) {
        questionGroups.set(baseId, [])
      }
      questionGroups.get(baseId).push(question)
    })

    // Assign numbers to question groups
    const questionNumbers = new Map()
    let questionNumber = 1
    questionGroups.forEach((group, baseId) => {
      questionNumbers.set(baseId, questionNumber++)
    })

    // Get question number from base ID
    const baseId = questionId.replace(/-[^-]+$/, '')
    return questionNumbers.get(baseId) || 1
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
            <div className="relative" ref={positionDropdownRef}>
              <label htmlFor="positionName" className="block text-sm font-medium text-gray-700 mb-2">
                Position Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="positionName"
                  value={positionSearch || formData.positionName}
                  onChange={(e) => {
                    setPositionSearch(e.target.value)
                    setShowPositionDropdown(true)
                  }}
                  onFocus={() => setShowPositionDropdown(true)}
                  placeholder="Search positions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {showPositionDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredPositions.length > 0 ? (
                    filteredPositions.map((position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() => handlePositionSelect(position)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        {position}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">No positions found</div>
                  )}
                </div>
              )}
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
                <option value="complete_code">🔧 Complete the Code (Function Templates)</option>
                <option value="write_code">📝 Write Code (From Scratch)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Languages {formData.type === 'complete_code' ? '(Select multiple for code templates)' : '(Select languages for problem labels)'}
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllLanguages}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {formData.languages.length === availableLanguages.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableLanguages.map((language) => (
                  <label key={language.id} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      id={`languages-${language.id}`}
                      name="languages"
                      value={language.id}
                      checked={formData.languages.includes(language.id)}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{language.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {formData.type === 'complete_code' 
                  ? '🔧 Function templates with language labels will be generated' 
                  : '📝 Problem statements with language labels will be generated (no code templates)'
                }
              </p>
            </div>

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
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {getQuestionNumber(question.id)}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-800">{question.title}</h3>
                      {question.language && (
                        <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold rounded-full">
                          {question.language.toUpperCase()}
                        </span>
                      )}
                    </div>
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

                    {question.hint && (
                      <div>
                        <h4 className="font-medium text-gray-700">Hint:</h4>
                        <p className="text-gray-600 mt-1 italic bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">💡 {question.hint}</p>
                      </div>
                    )}

                    {question.implementation && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-700">
                            Function Template
                          </h4>
                          {question.language && (
                            <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold rounded-full">
                              {question.language.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <pre className="bg-gray-50 p-4 rounded-lg text-sm border border-gray-300 overflow-x-auto font-mono">{question.implementation}</pre>
                        <p className="text-xs text-gray-600 mt-2 italic">
                          🔧 Fill in the function body to complete the solution
                        </p>
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