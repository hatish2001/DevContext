export default function BasicApp() {
  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      padding: '2rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        DevContext
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Your unified developer workspace
      </p>
      
      <div style={{ 
        backgroundColor: '#1a1a1a',
        padding: '2rem',
        borderRadius: '0.5rem',
        border: '1px solid #333'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Welcome to DevContext
        </h2>
        <p style={{ color: '#888', marginBottom: '1.5rem' }}>
          Connect your development tools to create a unified context for your work.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Connect GitHub
          </button>
          
          <button style={{
            backgroundColor: '#0052CC',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Connect Jira
          </button>
          
          <button style={{
            backgroundColor: '#4A154B',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            Connect Slack
          </button>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#1a1a1a',
        borderRadius: '0.375rem',
        border: '1px solid #333'
      }}>
        <p style={{ color: '#888', fontSize: '0.875rem' }}>
          ✅ Frontend is running at http://localhost:5173<br/>
          ✅ Backend API is running at http://localhost:3000<br/>
          ✅ Database and Redis are running in Docker
        </p>
      </div>
    </div>
  )
}
