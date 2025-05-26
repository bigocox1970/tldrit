import React from 'react';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  return (
    <div className="py-12">
      <h1 className="text-2xl font-bold text-center mb-8">Sign In</h1>
      <LoginForm />
    </div>
  );
};

export default LoginPage;