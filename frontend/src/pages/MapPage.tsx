import React, { useEffect } from 'react';
import { Layout } from '../components/Layout';

/**
 * Map Page Component
 * Displays the story map canvas with all interactive features
 * Requires authentication to access
 */
export const MapPage: React.FC = () => {
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      // Redirect to login if not authenticated
      window.location.href = '/';
    }
  }, []);

  return <Layout />;
};
