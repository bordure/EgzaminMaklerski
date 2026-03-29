import React from 'react';
import { useAuth } from '../AuthContext';
import { BookOpen } from 'lucide-react';
import { guestLogin } from '../api';

const LoginPage = () => {
  const { login, loading, error, setAuth } = useAuth();

  const handleGuestLogin = async () => {
    try {
      const data = await guestLogin();
      setAuth(data.access_token); 
    } catch (err) {
      console.error("Guest login failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        <div className="flex-[1.6] p-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-6">Egzamin Maklerski</h1>
          <p className="text-lg mb-4">
            Na tej stronie możesz ćwiczyć pytania z poprzednich egzaminów według tematu
            i zwiększyć swoje szanse na zdanie — obecny wskaźnik zdawalności wynosi tylko <strong>10%</strong>.
          </p>
          <p className="text-md">
            Platforma jest <strong>całkowicie bezpłatna</strong>.<br />
            Skup się na nauce, nie na opłatach.
          </p>
        </div>

        <div className="flex-[1] p-8 flex flex-col justify-center">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Zaloguj się</h2>
            <p className="text-gray-600">Dostęp do symulatora Egzaminu Maklerskiego</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Google Login */}
          <button
            onClick={login}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Kontynuuj przez Google
              </>
            )}
          </button>

          {/* Guest Login */}
        <button
          onClick={async () => {
            try {
              await login("guest");
            } catch (err) {
              console.error("Guest login failed:", err);
            }
          }}
          disabled={loading}
          className="w-full mt-3 flex items-center justify-center gap-3 bg-gray-100 border-2 border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>Kontynuuj jako Gość</>
          )}
        </button>


          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Logując się, zgadzasz się na bezpieczny dostęp do poprzednich egzaminów i śledzenie swoich postępów.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
