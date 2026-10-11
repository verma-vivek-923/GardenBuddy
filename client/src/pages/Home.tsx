import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Clock3, Flower2, Heart, Leaf, MapPin, Sparkles, Sun, Waves } from 'lucide-react';
import { activePlan } from '../lib/storage';
import { useGarden, useCapabilities } from '../lib/hooks';
import { Eyebrow } from '../components/Shared';

export function Home() {
  const snapshot = useGarden(), plan = activePlan(snapshot), { caps } = useCapabilities();
  return <>
    <section className="hero"><div className="container hero-layout"><div className="hero-copy"><Eyebrow>YOUR LITTLE CORNER OF GREEN</Eyebrow>
      <h1>A little care.<br/><em>A lot of growth.</em></h1>
      <p>Meet your personal AI gardening companion. Find a plant that fits your life, follow a thoughtful 7-day plan, and watch small moments grow into something beautiful.</p>
      <div className="hero-actions"><Link to="/setup" className="btn btn-primary btn-large">Start my garden <ArrowUpRight size={19}/></Link>{plan && <Link to="/garden" className="btn btn-outline btn-large">Continue my garden <ArrowRight size={18}/></Link>}</div>
      <div className="hero-trust"><div className="trust-icons"><span><Leaf size={16}/></span><span><Heart size={16}/></span><span><Sun size={16}/></span></div><span>No green thumb required. Just curiosity.</span></div>
    </div><div className="hero-graphic" aria-label="Illustration of a flourishing plant in a pot">
      <div className="hero-halo"/><div className="sparkle sparkle-a">✳</div><div className="sparkle sparkle-b">✦</div>
      <svg className="hero-plant" viewBox="0 0 450 470" role="img" aria-label="Leafy green plant growing in a terracotta pot"><defs><linearGradient id="pot" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#d7a17a"/><stop offset="1" stopColor="#a95f40"/></linearGradient><linearGradient id="leaf" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#84ad5b"/><stop offset="1" stopColor="#356c45"/></linearGradient></defs>
        <ellipse cx="225" cy="443" rx="115" ry="15" fill="#b8bba3" opacity=".4"/>
        <path d="M210 306 Q190 180 223 75 M220 313 Q300 175 348 138 M212 318 Q120 210 84 153 M220 307 Q244 197 282 125" fill="none" stroke="#427247" strokeWidth="8" strokeLinecap="round"/>
        <g fill="url(#leaf)"><path d="M222 195 Q108 196 119 89 Q209 94 222 195Z"/><path d="M235 182 Q259 76 345 66 Q348 155 235 182Z"/><path d="M185 255 Q100 275 56 210 Q151 175 185 255Z"/><path d="M256 267 Q285 171 390 202 Q356 286 256 267Z"/><path d="M215 118 Q160 51 215 4 Q286 49 215 118Z"/><path d="M262 216 Q311 185 356 137 Q369 217 262 216Z"/></g>
        <g fill="none" stroke="#b3d18c" strokeWidth="2.5" opacity=".7"><path d="M217 188 155 118 M246 170 322 96 M171 243 93 219 M276 251 361 217 M217 101 217 28"/></g>
        <path d="M146 309 H304 L286 423 Q225 442 165 423 Z" fill="url(#pot)"/><path d="M134 300 Q225 286 316 300 L314 330 Q225 346 136 330Z" fill="#c8815d"/><path d="M151 307 Q225 315 299 307" fill="none" stroke="#f0c0a0" strokeWidth="3" opacity=".6"/>
      </svg>
      <div className="floating-card float-top"><span className="floating-icon"><Sun size={20}/></span><div><small>Your garden vibe</small><strong>Bright & thriving</strong></div></div>
      <div className="floating-card float-bottom"><span className="floating-icon secondary"><Check size={19}/></span><div><small>Step by step</small><strong>7 days of tiny wins</strong></div></div>
    </div></div><div className="hero-bottom-wave"/></section>
    <section className="section steps-section"><div className="container"><div className="section-heading center"><Eyebrow>THE SIMPLE WAY TO START</Eyebrow><h2>Growing starts with <em>one small step.</em></h2><p>We take the guesswork out of gardening, so you can enjoy the good part.</p></div>
      <div className="steps-grid"><article className="step"><div className="step-icon sand"><MapPin size={29}/></div><span className="step-no">01 / TELL US ABOUT YOU</span><h3>Find your fit</h3><p>Share your space, sunlight, and schedule. We'll match plants to your real life.</p></article><article className="step"><div className="step-icon sage"><Flower2 size={29}/></div><span className="step-no">02 / MEET YOUR PLANT</span><h3>Pick your favorite</h3><p>Get three tailored plant suggestions and choose the one that feels right.</p></article><article className="step"><div className="step-icon peach"><Clock3 size={29}/></div><span className="step-no">03 / GROW EVERY DAY</span><h3>Follow a gentle plan</h3><p>Small daily care tasks, a satisfying checklist, and progress you can see.</p></article></div>
    </div></section>
    <section className="section lifestyle-section"><div className="container lifestyle-grid"><div className="lifestyle-art"><div className="lifestyle-big">🌱</div><div className="lifestyle-note"><Sparkles size={18}/> Made for real life, not perfect gardens</div></div><div className="lifestyle-copy"><Eyebrow>GOOD THINGS TAKE ROOT</Eyebrow><h2>Your pace.<br/><em>Your space.</em><br/>Your garden.</h2><p>From a sunny balcony to a quiet indoor corner, GardenBuddy helps you build a habit that sticks. Five minutes can be enough to begin.</p><div className="feature-lines"><span><Check size={17}/> Personalized to your conditions</span><span><Check size={17}/> Practical 7-day starter routines</span><span><Check size={17}/> Your progress stays saved in this browser</span></div><Link className="text-link" to="/setup">Let's get growing <ArrowRight size={18}/></Link></div></div></section>
    <section className="container closing-section"><div className="closing-panel"><Waves className="closing-decoration" size={200} strokeWidth={.8}/><Eyebrow>EVERY GARDEN HAS A BEGINNING</Eyebrow><h2>Ready to grow <em>something good?</em></h2><p>Your next favorite daily ritual might be just one seed away.</p><Link className="btn btn-cream" to="/setup">Create my garden <ArrowUpRight size={18}/></Link>{caps?.diagnosis && <Link className="closing-alt" to="/diagnose">Or check a plant photo</Link>}</div></section>
  </>;
}
