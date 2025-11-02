import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshAuthState } from '../services/googleDrive';
import { reloadFromDrive } from '../db';

export default function AuthCallback(){
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshAuthState();
        await reloadFromDrive();
      } catch (error){
        console.error('Errore durante la gestione del callback di Google Drive', error);
      } finally {
        if (!cancelled){
          navigate('/', { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="page-stack">
      <div className="card empty-state">Completamento accesso a Google Drive…</div>
    </div>
  );
}
