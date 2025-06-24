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
  functionTemplate?: string
}

interface InputParameters {
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
        problemStatement: q.problemStatement.substring(0, 100) + '...'
      })))
      console.log('Input Parameters:', inputParameters)
      
      return NextResponse.json({ 
        success: true, 
        message: `${questions.length} questions would be sent to Google Sheets`,
        note: 'Google Sheets credentials not configured. Questions logged to console.',
        questions: questions.map(q => q.title)
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

      // Prepare data for the sheet with input parameters
      const values = questions.map((question, index) => [
        new Date().toISOString(), // Timestamp
        inputParameters.positionName, // Position Name
        inputParameters.topic, // Topic
        inputParameters.difficultyLevel, // Difficulty Level
        inputParameters.type, // Type (from-scratch/complete-code)
        inputParameters.language, // Language (for complete-code type)
        inputParameters.problem || '', // Additional Problem Context
        inputParameters.hint || '', // Hint/Focus
        `Question ${index + 1}`, // Question Number
        question.title, // Question Title
        question.problemStatement, // Problem Statement
        question.inputFormat, // Input Format
        question.outputFormat, // Output Format
        question.constraints, // Constraints
        question.sampleInput, // Sample Input
        question.sampleOutput, // Sample Output
        question.functionTemplate || '' // Function Template (if applicable)
      ])

      // Enhanced header row with input parameters
      const headerRow = [
        'Timestamp',
        'Position Name',
        'Topic',
        'Difficulty Level',
        'Type',
        'Language',
        'Additional Context',
        'Hint/Focus',
        'Question Number',
        'Title',
        'Problem Statement',
        'Input Format',
        'Output Format',
        'Constraints',
        'Sample Input',
        'Sample Output',
        'Function Template'
      ]

      // First, try to add headers (this will fail if headers already exist, which is fine)
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEETS_ID,
          range: 'Sheet1!A1:Q1',
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
        range: 'Sheet1!A:Q',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      })

      console.log(`Successfully added ${questions.length} questions to Google Sheets`)

      return NextResponse.json({ 
        success: true, 
        message: `${questions.length} questions successfully sent to Google Sheets`,
        updatedRows: result.data.updates?.updatedRows || 0,
        questions: questions.map(q => q.title),
        inputParameters: inputParameters
      })

    } catch (sheetsError: any) {
      console.error('Google Sheets API error:', sheetsError)
      
      // Fallback response
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to connect to Google Sheets',
        details: sheetsError.message,
        fallback: `${questions.length} questions logged to console`,
        questions: questions.map(q => q.title)
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