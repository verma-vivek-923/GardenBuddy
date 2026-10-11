import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Setup } from './pages/Setup';
import { Garden } from './pages/Garden';
import { Diagnose } from './pages/Diagnose';
import { Empty } from './components/Shared';
import './styles.css';

function NotFound() { return <div className="container garden-empty"><Empty title="This path hasn't grown yet" description="We couldn't find that page. Your garden is just a click away." link="/" linkText="Back to home"/></div>; }
createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><Routes><Route element={<Layout/>}><Route index element={<Home/>}/><Route path="setup" element={<Setup/>}/><Route path="garden" element={<Garden/>}/><Route path="diagnose" element={<Diagnose/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></BrowserRouter></React.StrictMode>);
