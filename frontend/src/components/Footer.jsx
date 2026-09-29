const REPO_URL = 'https://github.com/JimmyAlter/CommerceSuite'

export const Footer = () => (
  <footer className="footer">
    <div className="footer-grid">
      <div className="footer-brand">
        <div className="brand">
          <div className="brand-icon">NT</div>
          <span>NovaTech Supply</span>
        </div>
        <p>
          A fictional company used as the demo brand for CommerceSuite, an
          open-source procurement storefront.
        </p>
      </div>
      <div className="footer-col">
        <h4>On this page</h4>
        <a href="#catalog">Product Catalog</a>
        <a href="#cart">Cart</a>
        <a href="#security">Security</a>
        <a href="#orders">Orders</a>
      </div>
      <div className="footer-col">
        <h4>Project</h4>
        <a href={REPO_URL} target="_blank" rel="noreferrer">Source on GitHub</a>
        <a href={`${REPO_URL}#api`} target="_blank" rel="noreferrer">API summary</a>
        <a href={`${REPO_URL}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">Security policy</a>
      </div>
    </div>
    <div className="footer-bottom">
      <span>CommerceSuite by Thiago Langone · MIT License</span>
    </div>
  </footer>
)
