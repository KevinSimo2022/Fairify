import React from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTutorial } from '../contexts/TutorialContext';

const steps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to Fairify!',
    content: 'This tour will guide you through the main workflow: uploading your dataset, exploring the map, analyzing results, and downloading your reports. Click Next to begin.',
    disableBeacon: true,
  },
  // --- Upload Page Steps ---
  {
    target: '[data-tour="upload-page"]',
    title: 'Upload Page',
    content: 'This is where you start your journey. Upload your CSV or GeoJSON file for analysis.',
    placement: 'right',
  },
  {
    target: '[data-tour="upload-drop"]',
    title: 'File Drop Area',
    content: 'Drag and drop your files here, or click to browse and select them from your computer.',
    placement: 'right',
  },
  {
    target: '[data-tour="upload-browse"]',
    title: 'Browse Files',
    content: 'Click here to open the file picker and select your dataset.',
    placement: 'right',
  },
  {
    target: '[data-tour="upload-context"]',
    title: 'Describe Your Dataset',
    content: 'Optionally, provide a description of your dataset to help with analysis context.',
    placement: 'right',
  },
  {
    target: '[data-tour="upload-history"]',
    title: 'Upload History',
    content: 'Track your uploaded files and their processing status here.',
    placement: 'left',
  },
  {
    target: '[data-tour="analyze-btn"]',
    title: 'Analyze Button',
    content: 'Once your file is ready, click Analyze to start the analysis.',
    placement: 'left',
  },
  {
    target: '[data-tour="view-results-btn"]',
    title: 'View Results',
    content: 'After analysis, click here to view your results on the map.',
    placement: 'right',
  },
  // --- Map View Steps ---
  {
    target: '[data-tour="map-view"]',
    title: 'Map View',
    content: 'Explore your data on the interactive map. Visualize density, bias, and coverage.',
    placement: 'right',
  },
  {
    target: '[data-tour="dataset-select"]',
    title: 'Dataset Selection',
    content: 'Switch between uploaded datasets to view different analyses.',
    placement: 'right',
  },
  {
    target: '[data-tour="map-controls"]',
    title: 'Map Controls',
    content: 'Use these controls to zoom, reset, and interact with the map.',
    placement: 'right',
  },
  {
    target: '[data-tour="map-layers"]',
    title: 'Map Layers',
    content: 'Toggle different visualization layers, such as heatmap, points, and coverage gaps.',
    placement: 'right',
  },
  {
    target: '[data-tour="map-legend"]',
    title: 'Map Legend',
    content: 'Understand the meaning of map colors and symbols here.',
    placement: 'right',
  },
  {
    target: '[data-tour="map-dataset-info"]',
    title: 'Dataset Info',
    content: 'See summary stats for the selected dataset.',
    placement: 'right',
  },
  // --- Dashboard Steps ---
  {
    target: '[data-tour="dashboard-page"]',
    title: 'Dashboard',
    content: 'Analyze your data with key metrics and regional insights.',
    placement: 'right',
  },
  {
    target: '[data-tour="dashboard-dataset-select"]',
    title: 'Dataset Selection',
    content: 'Choose which dataset to analyze on the dashboard.',
    placement: 'right',
  },
  {
    target: '[data-tour="dashboard-metrics"]',
    title: 'Key Metrics',
    content: 'Review important statistics about your dataset.',
    placement: 'right',
  },
  {
    target: '[data-tour="dashboard-regional-chart"]',
    title: 'Regional Bias Analysis',
    content: 'Visualize bias and coverage by region.',
    placement: 'right',
  },
  // --- Results Steps ---
  {
    target: '[data-tour="results-page"]',
    title: 'Results',
    content: 'View and download your analysis results and reports.',
    placement: 'right',
  },
  {
    target: '[data-tour="results-search"]',
    title: 'Search & Filter',
    content: 'Search and filter your results by filename or status.',
    placement: 'right',
  },
  {
    target: '[data-tour="results-grid"]',
    title: 'Results Grid',
    content: 'See a summary of each analysis, including bias, gini, and coverage.',
    placement: 'top',
  },
  {
    target: '[data-tour="results-download"]',
    title: 'Download & Export',
    content: 'Download your results as PDF, CSV, or JSON, or bulk export all.',
    placement: 'top',
  },
];


export default function AppTutorial() {
  const { run, setRun, stepIndex, setStepIndex } = useTutorial();

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
    } else if (type === 'step:after') {
      setStepIndex(index + 1);
    } else if (type === 'step:before') {
      setStepIndex(index);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      styles={{
        options: {
          zIndex: 2000,
        },
      }}
      callback={handleJoyrideCallback}
    />
  );
}
