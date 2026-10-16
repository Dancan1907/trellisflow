/**
 * Landing page (temporary).
 *
 * This is a placeholder until we build the real landing page in Wave 1.
 * It exists so that `pnpm dev` shows something meaningful at localhost:3001.
 */
export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>TrellisFlow</h1>
      <p style={{ fontSize: '1.125rem', color: '#555', textAlign: 'center', maxWidth: '40rem' }}>
        Personal wealth platform — track personal money, investments, and businesses in one place.
      </p>
      <p style={{ marginTop: '2rem', color: '#888', fontSize: '0.875rem' }}>
        Coming soon · Wave 1 in progress
      </p>
    </main>
  );
}
