import Navigation from '@app/components/Navigation';
import {Outlet} from 'react-router-dom';
export default function PageShell(){return <div className="eval-shell"><Navigation/><main className="eval-main"><Outlet/></main></div>;}
