import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

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

interface InputParameters {
  positionName: string
  languages: string[]
  problem: string
  hint: string
  type: 'complete_code' | 'write_code'
  difficultyLevel: 'easy' | 'medium' | 'hard'
  topic: string
}

export async function POST(request: NextRequest) {
  try {
    const { questions, inputParameters }: { 
      questions: Question[]
      inputParameters: InputParameters 
    } = await request.json()

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions provided' },
        { status: 400 }
      )
    }

    // Check if Google Sheets credentials are configured
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      // Fallback: Just log the questions and return success
      console.log('Google Sheets credentials not configured. Questions to be sent:', questions.map(q => ({
        title: q.title,
        language: q.language,
        type: inputParameters.type
      })))
      console.log('Input Parameters:', inputParameters)
      
      return NextResponse.json({ 
        success: true, 
        message: `${questions.length} questions would be sent to Google Sheets`,
        note: 'Google Sheets credentials not configured. Questions logged to console.',
        questions: questions.map(q => `${q.title} (${q.language?.toUpperCase() || 'N/A'})`)
      })
    }

    try {
      // Set up Google Sheets API authentication
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })

      const sheets = google.sheets({ version: 'v4', auth })

      // Prepare data for the sheet - each question-language combination gets its own row
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

      const values = questions.map((question) => {
        // Get question number from base ID
        const baseId = question.id.replace(/-[^-]+$/, '')
        const questionNum = questionNumbers.get(baseId) || 1

        return [
          inputParameters.positionName, // Position Name
          question.language?.toUpperCase() || 'N/A', // Language
          // Format problem field WITHOUT numbering for export - direct start, no labels
          `${question.problemStatement}\n\nExample:\nInput: ${question.sampleInput}\nOutput: ${question.sampleOutput}\n\nConstraints:\n${question.constraints}${question.implementation ? `\n\n${question.implementation}` : ''}`,
          inputParameters.hint || question.hint || '', // Hint
          inputParameters.type, // Type
          inputParameters.difficultyLevel // Difficulty level
        ]
      })

      // Simple header row with only the requested columns
      const headerRow = [
        'Position Name',
        'Language',
        'Problem',
        'Hint',
        'Type',
        'Difficulty level'
      ]

      // First, try to add headers (this will fail if headers already exist, which is fine)
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEETS_ID,
          range: 'Sheet1!A1:F1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [headerRow],
          },
        })
      } catch (headerError) {
        // Headers might already exist, continue
        console.log('Headers might already exist, continuing...')
      }

      // Append the question data
      const result = await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID,
        range: 'Sheet1!A:F',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      })

      console.log(`Successfully added ${questions.length} question entries to Google Sheets`)

      // Group questions by their base title for response
      const questionSummary = questions.reduce((acc, q) => {
        const baseTitle = q.title
        if (!acc[baseTitle]) {
          acc[baseTitle] = []
        }
        acc[baseTitle].push(q.language?.toUpperCase() || 'N/A')
        return acc
      }, {} as Record<string, string[]>)

      return NextResponse.json({ 
        success: true, 
        message: `${questions.length} question entries successfully sent to Google Sheets`,
        details: `Each language creates a separate row in the sheet`,
        updatedRows: result.data.updates?.updatedRows || 0,
        questionSummary,
        inputParameters: {
          ...inputParameters,
          totalLanguages: inputParameters.languages.length,
          totalEntries: questions.length
        }
      })

    } catch (sheetsError: any) {
      console.error('Google Sheets API error:', sheetsError)
      
      // Fallback response
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Google Sheets',
        details: sheetsError.message,
        fallback: `${questions.length} questions logged to console`,
        questions: questions.map(q => `${q.title} (${q.language?.toUpperCase() || 'N/A'})`)
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Error sending to sheets:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    )
  }
}

/*
Setup Instructions for Google Sheets Integration:

1. Go to Google Cloud Console (https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API
4. Create a service account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Fill in the details and create
5. Create a key for the service account:
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose JSON format and download
6. Share your Google Sheet with the service account email
7. Add the following environment variables to your .env.local:
   - GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account-email
   - GOOGLE_SHEETS_PRIVATE_KEY=your-private-key-from-json-file
   - GOOGLE_SHEETS_ID=your-google-sheet-id (from the URL)
*/ 