import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider, useLocation } from 'react-router-dom';
import PageShell from './components/PageShell';
import { TooltipProvider } from './components/ui/tooltip';
import { ToastProvider } from './contexts/ToastContext';
import { EvalHistoryProvider } from './contexts/EvalHistoryContext';
import EvalPage from './pages/eval/page';
import ComparisonPage from './extensions/ComparisonPage';
import EvaluationsPage from './extensions/EvaluationsPage';
import EvalsIndexPage from './pages/evals/page';
import { BusinessProvider } from './extensions/shared';
import TeamsPage from './extensions/TeamsPage';
import TeamDetailPage from './extensions/TeamDetailPage';
import SkillsPage from './extensions/SkillsPage';
import ModelsPage from './extensions/ModelsPage';
import RunPage from './extensions/RunPage';
import McpPage from './extensions/McpPage';
import './taskdoor.css';
function Home(){const q=new URLSearchParams(useLocation().search);if(q.get('result'))return <Navigate replace to={'/history?'+q.toString()}/>;return <Navigate replace to={({skills:'/skills',teams:'/teams',cases:'/teams',settings:'/models',runs:'/evals'} as Record<string,string>)[q.get('page')||'']||'/evals'}/>;}
const router=createBrowserRouter(createRoutesFromElements(<Route element={<BusinessProvider><PageShell/></BusinessProvider>}><Route index element={<Home/>}/><Route path="test-lab.html" element={<Home/>}/><Route path="evals" element={<EvaluationsPage><EvalsIndexPage/></EvaluationsPage>}/><Route path="eval" element={<Navigate to="/evals" replace/>}/><Route path="eval/:evalId" element={<ComparisonPage><EvalPage/></ComparisonPage>}/><Route path="skills" element={<SkillsPage/>}/><Route path="prompts" element={<Navigate to="/skills" replace/>}/><Route path="teams" element={<TeamsPage/>}/><Route path="teams/:teamId" element={<TeamDetailPage/>}/><Route path="datasets" element={<Navigate to="/teams" replace/>}/><Route path="models" element={<ModelsPage/>}/><Route path="mcp" element={<McpPage/>}/><Route path="setup" element={<RunPage/>}/><Route path="history" element={<RunPage/>}/><Route path="*" element={<Navigate to="/evals" replace/>}/></Route>));
const client=new QueryClient();
export default function App(){return <TooltipProvider><ToastProvider><EvalHistoryProvider><QueryClientProvider client={client}><RouterProvider router={router}/></QueryClientProvider></EvalHistoryProvider></ToastProvider></TooltipProvider>;}
