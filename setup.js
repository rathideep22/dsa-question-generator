const fs = require('fs');
const path = require('path');

const envContent = `# DSA Question Generator Environment Variables
GEMINI_API_KEY=AIzaSyD5WYUxXNcG-_9PsQ04wlngdgh4-9NK1dM
GOOGLE_SHEETS_ID=1EJZQf_LMX4BaVtYL7-Fe-Z4jncme0kMI0deNhngWMhk

# Google Sheets API Configuration (Optional)
# Uncomment and fill these in after setting up Google Cloud Service Account
# GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
# GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour private key here\\n-----END PRIVATE KEY-----\\n"
`;

const envPath = path.join(__dirname, '.env.local');

try {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local file created successfully!');
  console.log('📍 Location:', envPath);
  console.log('\n🔧 Setup Instructions:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm run dev');
  console.log('3. Open: http://localhost:3000');
  console.log('\n📊 For Google Sheets integration:');
  console.log('- Follow the Google Sheets setup instructions in README.md');
  console.log('- Update the GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY variables');
} catch (error) {
  console.error('❌ Error creating .env.local file:', error.message);
} 