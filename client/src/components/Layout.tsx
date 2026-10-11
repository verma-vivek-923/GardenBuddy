import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUpRight, Leaf, Sprout } from 'lucide-react';
import { useCapabilities, useGarden } from '../lib/hooks';
import { activePlan } from '../lib/storage';

export function Brand() { return <Link to="/" className="brand" aria-label="GardenBuddy home"><span className="brand-mark"><Sprout size={24} strokeWidth={2.5}/></span><span>garden<span className="brand-light">buddy</span><span className="brand-dot">.</span></span></Link>; }
export function Layout() {
  const snapshot = useGarden(), { caps } = useCapabilities(), route = useLocation();
  const existing = !!activePlan(snapshot);
  return <div className="app-shell">
    <a className="skip" href="#main">Skip to content</a>
    <header className="site-header"><div className="container header-inner">
      <Brand/>
      <nav aria-label="Main navigation" className="nav-links"><NavLink end to="/">Home</NavLink><NavLink to="/setup">Get started</NavLink><NavLink to="/garden">My garden</NavLink>{caps?.diagnosis && <NavLink to="/diagnose">Plant doctor</NavLink>}</nav>
      <Link className="header-cta" to={existing ? '/garden' : '/setup'}>{existing ? 'My garden' : 'Start growing'} <ArrowUpRight size={15}/></Link>
    </div></header>
    <main id="main" key={route.pathname}><Outlet /></main>
    <footer className="site-footer"><div className="container footer-grid">
      <div><Brand/><p>Little steps. Greener spaces. <Leaf size={14} aria-hidden="true" /></p></div>
      <div className="footer-notes">GardenBuddy offers AI-generated general gardening guidance, not live weather advice or a confirmed plant diagnosis. Your garden data stays in this browser; uploaded photos are sent to your configured AI provider and are not saved by GardenBuddy.</div>
      <div className="footer-links"><Link to="/setup">Start a garden</Link><Link to="/garden">Your workspace</Link>{caps?.diagnosis && <Link to="/diagnose">Plant doctor</Link>}</div>
    </div><div className="container copyright">© 2026 GardenBuddy AI · Made for everyday growing.</div></footer>
  </div>;
}
