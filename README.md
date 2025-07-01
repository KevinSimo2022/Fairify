# Fairify - Geospatial Bias Analysis Platform

🌐 **Live Demo**: https://profound-lokum-a8784e.netlify.app/

Github Repo Link:
https://github.com/KevinSimo2022/Fairify

Additional Files:
https://drive.google.com/drive/folders/1ye6k6OmtcMRMZIPuqi7tFLhah3iQS5ic?usp=sharing

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://typescript.org)
[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-9.0-orange.svg)](https://firebase.google.com)

Fairify is a comprehensive platform for analyzing bias in geospatial datasets, with advanced tools for environmental and climate data analysis. The platform helps ensure fairness and representation in geographical data through interactive visualizations, automated bias detection, and comprehensive reporting.

## 🌟 Features

- **� Data Upload**: Secure CSV and GeoJSON file uploads with validation
- **🗺️ Interactive Maps**: Visualize data density and coverage gaps with interactive heatmaps
- **📊 Bias Analysis**: Calculate Gini coefficients and fairness metrics automatically
- **� Regional Analysis**: Analyze data distribution across administrative boundaries
- **🤖 AI-Powered Insights**: Automated bias detection using Google Gemini AI
- **📈 Real-time Analytics**: Live statistics and monitoring dashboards
- **📱 Responsive Design**: Works seamlessly across desktop and mobile devices
- **🌍 Multi-Country Support**: Support for Kenya, Rwanda, and Cameroon

## 🗺️ Supported Countries & Regions

### Kenya
- All 47 counties with accurate population data
- Real administrative boundaries from GeoJSON
- Coverage bias analysis based on 2019 census data

### Rwanda  
- 5 provinces (Eastern, Western, Northern, Southern, Kigali)
- Administrative boundary support

### Cameroon
- 10 regions with population mapping
- Regional bias analysis capabilities

## 🏗️ Architecture

The platform consists of:

- **Frontend**: React 18 with TypeScript, Vite, and Tailwind CSS
- **Backend**: Firebase Functions with TypeScript for data processing
- **Database**: Cloud Firestore for dataset metadata and analysis results
- **Authentication**: Firebase Auth for user management
- **Storage**: Firebase Storage for file uploads
- **AI**: Google Gemini integration for bias analysis
- **Maps**: Interactive mapping with spatial analysis capabilities
- **Spatial Analysis**: Point-in-polygon calculations and regional assignments

## 📊 Analysis Capabilities

### Bias Metrics
- **Gini Coefficient**: Measure inequality in data distribution
- **Coverage Ratio**: Compare actual vs expected distribution based on population
- **Regional Statistics**: Point counts, averages, and density metrics
- **Data Points Per Capita**: Normalize data by population for fair comparison

### Spatial Analysis
- **Point-in-Polygon**: Accurate assignment of data points to administrative regions
- **Country Detection**: Automatic detection of country from coordinate bounds
- **Regional Filtering**: Hide data points that fall outside known boundaries
- **Population Mapping**: Integration with census data for bias calculations

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
- [Git](https://git-scm.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/fairify.git
   cd fairify
   ```

2. **Install dependencies**

   ```bash
   # Install frontend dependencies
   npm install

   # Install Firebase Functions dependencies
   cd functions
   npm install
   cd ..
   ```

3. **Set up Firebase**

   ```bash
   # Login to Firebase
   firebase login

   # Initialize Firebase project (if not already done)
   firebase init
   ```

4. **Configure Vite (optional)**
   Copy the example Vite config if you want custom settings:

   ```bash
   cp vite.config.ts.example vite.config.ts
   ```

5. **Configure environment variables**
   Create a `.env` file in the root directory:

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_USE_EMULATORS=false
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

### Firebase Emulator Setup (Optional)

For local development with Firebase emulators:

1. **Start Firebase emulators**

   ```bash
   firebase emulators:start
   ```

2. **Update environment variables**
   Set `VITE_USE_EMULATORS=true` in your `.env` file

## 📁 Project Structure

```
fairify/
├── src/                          # Frontend source code
│   ├── components/              # React components
│   │   ├── ui/                 # Reusable UI components
│   │   ├── AIAnalysis.tsx      # AI-powered analysis component
│   │   ├── InteractiveMap.tsx  # Map visualization component
│   │   └── Navbar.tsx          # Navigation component
│   ├── pages/                  # Application pages
│   │   ├── Home.tsx           # Landing page
│   │   ├── Upload.tsx         # File upload page
│   │   ├── MapView.tsx        # Map visualization page
│   │   └── Dashboard.tsx      # Analytics dashboard
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   ├── utils/                 # Helper functions
│   │   ├── spatialAnalysis.ts  # Spatial analysis utilities
│   │   └── regionPopulations.ts # Population data for regions
├── functions/                   # Firebase Functions
│   ├── src/
│   │   ├── ai/               # AI analysis functions
│   │   ├── analysis/         # Data processing functions
│   │   │   └── practicalDataProcessor.ts # Main data processor
│   │   ├── auth/             # Authentication functions
│   │   └── storage/          # File handling functions
├── public/                     # Static assets
├── firebase.json              # Firebase configuration
├── firestore.rules           # Database security rules
└── package.json              # Dependencies and scripts
```

## 🛠️ Technology Stack

### Frontend

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful and accessible component library
- **Lucide React** - Icon library
- **React Router** - Client-side routing

### Backend & Services

- **Firebase Functions** - Serverless backend functions
- **Cloud Firestore** - NoSQL document database
- **Firebase Storage** - File storage and hosting
- **Firebase Auth** - Authentication and user management
- **Google Gemini AI** - Advanced AI analysis capabilities

### Development Tools

- **ESLint** - Code linting and formatting
- **Jest** - Unit testing framework
- **Firebase Emulator Suite** - Local development environment

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run build:dev       # Build for development
npm run preview         # Preview production build
npm run lint            # Run ESLint

# Firebase
firebase serve          # Serve Firebase project locally
firebase deploy         # Deploy to Firebase
firebase emulators:start # Start Firebase emulators

# Functions
cd functions && npm run build    # Build Firebase Functions
cd functions && npm run serve    # Serve functions locally
cd functions && npm run deploy   # Deploy functions only
```

## 🚀 Usage

### Uploading Data

1. **Navigate to Upload page**
2. **Select or drag CSV/GeoJSON files** (max 50MB)
3. **Add dataset context** (optional but recommended)
4. **Click "Analyze"** to process the dataset

### Viewing Results

1. **Go to Map View** after analysis completes
2. **Select dataset** from the dropdown
3. **Explore interactive map** with data points and regional boundaries
4. **View bias metrics** in the statistics panel

### Understanding Bias Metrics

- **Coverage Ratio = 1.0**: Perfect representation relative to population
- **Coverage Ratio > 1.0**: Over-represented (more data than expected)
- **Coverage Ratio < 1.0**: Under-represented (less data than expected)
- **Gini Coefficient**: 0 = perfect equality, 1 = maximum inequality

## 🗃️ Data Format Requirements

### CSV Files
```csv
id,latitude,longitude,value,category
1,-1.286389,36.817223,100,environmental
2,-1.292066,36.821946,85,environmental
```

Required columns:
- `latitude` or `lat`: Latitude coordinate
- `longitude` or `lng` or `lon`: Longitude coordinate  
- `id`: Unique identifier (optional, will be generated if missing)

### GeoJSON Files
Standard GeoJSON format with Point features:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [36.817223, -1.286389]
      },
      "properties": {
        "id": "1",
        "value": 100,
        "category": "environmental"
      }
    }
  ]
}
```

## 🚀 Deployment

### Production Deployment

1. **Build the project**

   ```bash
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

### Staging Deployment

1. **Build for development**

   ```bash
   npm run build:dev
   ```

2. **Deploy to staging**
   ```bash
   firebase deploy --project staging
   ```

### Continuous Integration

The project includes GitHub Actions workflows for:

- Automated testing on pull requests
- Deployment to staging on merge to `develop`
- Deployment to production on merge to `main`

### Environment Configuration

Configure different environments using Firebase projects:

```bash
# Add production environment
firebase use --add production

# Add staging environment
firebase use --add staging

# Switch between environments
firebase use staging
firebase use production
```

## 📊 Monitoring & Analytics

### Firebase Analytics

- User engagement tracking
- Performance monitoring
- Error reporting

### Custom Metrics

- Data upload success rates
- Analysis completion times
- User activity patterns

## 🔐 Security

### Authentication

- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- Session management

### Data Protection

- File upload validation and sanitization
- Firestore security rules for data access control
- Rate limiting on API endpoints
- Input validation and type checking

### Firebase Security Rules

```javascript
// Firestore rules ensure users can only access their own data
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /datasets/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    match /analyses/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Guidelines

- Follow TypeScript best practices
- Write unit tests for new features
- Update documentation as needed
- Follow the existing code style
- Use meaningful commit messages

### Adding New Countries

1. **Add population data** in `src/utils/regionPopulations.ts`
2. **Update coordinate bounds** in `detectCountryFromCoordinates()`
3. **Add GeoJSON boundaries** to Firebase Storage
4. **Update boundary loading** in `getBoundariesForCountry()`

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Write descriptive variable and function names
- Add JSDoc comments for public functions

## 🐛 Troubleshooting

### Common Issues

**Data points not showing on map:**
- Ensure coordinates are within supported country boundaries
- Check that CSV has proper latitude/longitude columns
- Verify data points fall within valid coordinate ranges

**Analysis failing:**
- Check file size is under 50MB limit
- Ensure file format is CSV or GeoJSON
- Verify Firebase Functions are deployed and running

**Coverage bias showing as 0:**
- Ensure population data exists for detected regions
- Check that data points are being assigned to regions correctly
- Verify region names match between boundaries and population data

### Debug Mode

Enable debug logging by setting:
```env
VITE_DEBUG=true
```

This will show detailed console logs for spatial analysis and region assignment.

## 🙏 Acknowledgments

- Google Gemini AI for advanced analysis capabilities
- Firebase team for excellent backend services
- Tailwind CSS for utility-first styling
- The open-source community for amazing tools and libraries

---
