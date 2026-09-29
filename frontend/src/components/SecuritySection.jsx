import { FeatureCard } from './FeatureCard'

export const SecuritySection = () => (
  <section id="security" className="section section-alt">
    <div className="section-head">
      <h2>Security & Compliance</h2>
      <p>Built with authentication, rate limiting, and server-side order rules.</p>
    </div>
    <div className="feature-grid">
      <FeatureCard
        icon="shield"
        title="Secure authentication"
        description="JWT sessions (HS256, 8-hour expiry), bcrypt password hashing and a per-client login rate limit."
      />
      <FeatureCard
        icon="lock"
        title="Order integrity"
        description="Server-side totals and real-time inventory checks prevent client-side tampering."
      />
      <FeatureCard
        icon="layers"
        title="Operational controls"
        description="Roles are re-read from the database on every request, and order status changes are validated on the server."
      />
    </div>
  </section>
)
