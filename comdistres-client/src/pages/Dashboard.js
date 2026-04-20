import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Dashboard(){
  const { user } = useContext(AuthContext);
  return (
    <>
      <Navbar />
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold">Hello {user?.name || 'User'}</h1>
        <p className="text-slate-600 mt-2">Role: {user?.role}</p>
      </div>
    </>
  );
}
