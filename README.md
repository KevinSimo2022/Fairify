# Fairify - Geospatial Bias Analysis Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://typescript.org)
[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-9.0-orange.svg)](https://firebase.google.com)

Fairify is a comprehensive platform for analyzing bias in geospatial datasets, with advanced tools for environmental and climate data analysis. The platform helps ensure fairness and representation in geographical data through interactive visualizations, automated bias detection, and comprehensive reporting.

## 🌟 Features

- **🔒 Secure Data Upload**: Enterprise-grade security for CSV and GeoJSON file uploads
- **🗺️ Interactive Maps**: Visualize data density and coverage gaps with interactive heatmaps
- **📊 Bias Analysis**: Calculate Gini coefficients and fairness metrics automatically
- **🛡️ Enterprise Security**: Role-based access control with 2FA and audit logging
- **🤖 AI-Powered Insights**: Automated bias detection using Google Gemini AI
- **📈 Real-time Analytics**: Live statistics and monitoring dashboards
- **📱 Responsive Design**: Works seamlessly across desktop and mobile devices

## 🏗️ Architecture

The platform consists of:

- **Frontend**: React 18 with TypeScript, Vite, and Tailwind CSS
- **Backend**: Firebase Functions with TypeScript
- **Database**: Cloud Firestore for data storage
- **Authentication**: Firebase Auth with multi-factor authentication
- **Storage**: Firebase Storage for file uploads
- **AI**: Google Gemini integration for bias analysis
- **Maps**: Interactive mapping with spatial analysis capabilities

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

4. **Configure environment variables**
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

5. **Start the development server**

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
│   └── utils/                 # Helper functions
├── functions/                   # Firebase Functions
│   ├── src/
│   │   ├── ai/               # AI analysis functions
│   │   ├── analysis/         # Data processing functions
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

- Encryption at rest and in transit
- Firestore security rules
- File upload validation
- Rate limiting

### Compliance

- GDPR compliance features
- Data retention policies
- Audit logging

### Development Guidelines

- Follow TypeScript best practices
- Write unit tests for new features
- Update documentation as needed
- Follow the existing code style
- Use meaningful commit messages

## 🙏 Acknowledgments

- Google Gemini AI for advanced analysis capabilities
- Firebase team for excellent backend services
- Tailwind CSS for utility-first styling
- The open-source community for amazing tools and libraries

---
