import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="flex bg-gray-900 h-screen font-sans text-navy relative overflow-hidden items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-gray-900" />
      <div className="glass p-10 max-w-md w-full z-10 text-center flex flex-col shadow-2xl relative">
          <h1 className="text-3xl font-bold text-white mb-2">CampusXR</h1>
          <p className="text-gray-300 font-medium mb-8">Admin Panel Login</p>
          
          <form className="flex flex-col gap-4 text-left" onSubmit={handleLogin}>
              <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-200 mb-1">Email</label>
                  <input type="email" placeholder="admin@campusxr.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400" />
              </div>
              <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-200 mb-1">Password</label>
                  <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400" />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}
              
              <button type="submit" className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors">
                  Log In
              </button>
          </form>

          <a href="/" className="mt-6 text-sm font-medium text-gray-400 hover:text-white transition-colors">
              Return to User Tour
          </a>
      </div>
    </div>
  );
}
