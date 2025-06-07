# AI Analysis Setup Guide

## Getting Your Google Gemini API Key

1. **Go to Google AI Studio**: Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

2. **Sign in**: Use your Google account (the same one you used for Google Cloud)

3. **Create API Key**:

   - Click "Create API Key"
   - Select your Google Cloud project
   - Copy the generated API key

4. **Add to Environment**:

   - Open the `.env` file in your project root
   - Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key
   - Example: `VITE_GEMINI_API_KEY=AIzaSyBnN2YwYM5kzTp9...`

5. **Restart Development Server**:
   ```bash
   npm run dev
   ```

## AI Features

The AI Analysis component provides:

- **Automated Statistical Analysis**: AI calculates and interprets bias metrics
- **Natural Language Insights**: Human-readable explanations of data patterns
- **Bias Pattern Recognition**: Identifies specific types of bias in your data
- **Coverage Analysis**: Evaluates geographical distribution quality
- **Actionable Recommendations**: Suggests improvements for data collection
- **Risk Assessment**: Categorizes datasets by bias risk level

## How It Works

1. **Data Processing**: The AI analyzes your dataset's statistical properties
2. **Pattern Recognition**: Identifies bias patterns and coverage gaps
3. **Interpretation**: Generates human-readable insights about the data
4. **Recommendations**: Provides specific actions to improve data quality

## Security Notes

- API keys are stored locally in environment variables
- No data is permanently stored by Google's AI service
- Only statistical summaries are sent to the AI, not raw data points
- All analysis happens in real-time

## Troubleshooting

**API Key Issues**:

- Make sure the API key is correctly copied
- Ensure you've enabled the Gemini API in Google Cloud Console
- Check that billing is enabled for your Google Cloud project

**Analysis Not Loading**:

- Check browser console for errors
- Verify your internet connection
- Ensure you have sufficient API quota

**Empty Analysis**:

- Make sure your dataset has data points loaded
- Check that latitude/longitude coordinates are valid
- Verify the dataset has been properly processed
