import React from 'react';

const App = () => {
  console.log('App component rendering...');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#1E88E5', fontSize: '32px', marginBottom: '20px' }}>
        🗺️ Maphera Debug
      </h1>
      <p style={{ fontSize: '18px', color: '#333' }}>
        If you can see this, the basic React app is working!
      </p>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Debug Information:</h2>
        <ul>
          <li>React is rendering ✅</li>
          <li>CSS styles are working ✅</li>
          <li>App component loaded ✅</li>
        </ul>
      </div>
    </div>
  );
};

export default App;
