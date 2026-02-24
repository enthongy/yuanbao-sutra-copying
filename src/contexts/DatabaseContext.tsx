// src/contexts/DatabaseContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../database';
import { Sutra } from '../types';

interface DatabaseContextType {
  sutras: Sutra[];
  loading: boolean;
  error: string | null;
  refreshSutras: () => Promise<void>;
  getSutra: (id: number) => Promise<Sutra | undefined>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sutras, setSutras] = useState<Sutra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        await db.init();
        await refreshSutras();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
        console.error('Database initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initDB();
  }, []);

  const refreshSutras = async () => {
    try {
      const data = await db.getAllSutras();
      setSutras(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sutras');
    }
  };

  const getSutra = async (id: number) => {
    return db.getSutra(id);
  };

  return (
    <DatabaseContext.Provider value={{
      sutras,
      loading,
      error,
      refreshSutras,
      getSutra
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
};