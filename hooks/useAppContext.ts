
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

export const use_app_context = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('use_app_context must be used within an AppProvider');
  }
  return context;
};