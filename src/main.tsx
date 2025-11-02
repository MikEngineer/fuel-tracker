import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './ui.css';
import App from './App';
import Home from './pages/Home';
import Vehicles from './pages/Vehicles';
import Refuels from './pages/Refuels';
import NewRefuel from './pages/NewRefuel';
import Stats from './pages/Stats';
import Backup from './pages/Backup';

const router = createBrowserRouter([
  { path:'/', element:<App/>, children:[
    { index:true, element:<Home/> },
    { path:'vehicles', element:<Vehicles/> },
    { path:'refuels', element:<Refuels/> },
    { path:'refuels/new', element:<NewRefuel/> },
    { path:'stats', element:<Stats/> },
    { path:'backup', element:<Backup/> },
  ]}
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><RouterProvider router={router}/></React.StrictMode>
);
