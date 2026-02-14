import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-8" style={{ background: 'linear-gradient(135deg, #ECEFF1 0%, #FFFFFF 100%)' }}>
      <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '4rem 2rem' }}>
        <h1 style={{ color: 'var(--primary-color)', fontSize: '5rem', lineHeight: '1', marginBottom: '1rem' }}>SVD OS</h1>
        <p style={{ color: 'var(--light-text-color)', fontSize: '1.2rem', marginBottom: '3rem', letterSpacing: '0.1em' }}>
          RESTAURANT-FI OPERATING SYSTEM v1.0
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8f9fa' }}>
            <h3 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>TALENT INTELLIGENCE</h3>
            <p style={{ marginBottom: '1.5rem' }}>Skill Visualization & Evaluation System</p>
            <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>INITIALIZING...</span>
          </div>

          <div style={{ padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8f9fa', opacity: 0.7 }}>
            <h3 style={{ color: 'var(--primary-color)', fontSize: '2rem', marginBottom: '0.5rem' }}>MOMENTUM PEAKS</h3>
            <p style={{ marginBottom: '1.5rem' }}>Strategic Budgeting & Forecasting</p>
            <span style={{ color: 'var(--light-text-color)', fontSize: '0.9rem' }}>WAITING FOR MODULE</span>
          </div>
        </div>
      </div>
      
      <footer style={{ marginTop: '3rem', color: 'var(--light-text-color)', fontSize: '0.9rem' }}>
        © 2025 SAPPORO VIEWTIFUL DINING
      </footer>
    </main>
  );
}
