import React from 'react';
import RegisterForm from '../components/auth/RegisterForm';

const RegisterPage: React.FC = () => {
  return (
    <div className="py-12">
      <h1 className="text-2xl font-bold text-center mb-8">Create Account</h1>
      <RegisterForm />
    </div>
  );
};

export default RegisterPage;